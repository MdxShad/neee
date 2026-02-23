import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role, ExpenseType, PaymentStatus } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import { formatINR } from '@/lib/money';
import { StatCard } from '@/components/ui/stat-card';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) {
    if (!user.parentId) return { consultantId: '__NONE__' };
    return { consultantId: user.parentId };
  }
  // AGENT
  return { agentId: user.id };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const admissionWhere = scopeWhere(user);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const [
    totalAdmissions,
    totalProfitAgg,
    pendingUniversity,
    pendingAgent,
    monthlyIncomeAgg,
    monthlyDailyExpenseAgg,
    monthlyAdmissionExpenseAgg
  ] = await Promise.all([
    prisma.admission.count({ where: admissionWhere }),
    prisma.profitLedger.aggregate({
      where: { admission: admissionWhere },
      _sum: { netProfit: true }
    }),
    prisma.universityLedger.aggregate({
      where: { status: PaymentStatus.PENDING, admission: admissionWhere },
      _sum: { amountPayable: true, amountPaid: true }
    }),
    prisma.agentLedger.aggregate({
      where: { status: PaymentStatus.PENDING, admission: admissionWhere },
      _sum: { commissionAmount: true, amountPaid: true }
    }),
    prisma.admission.aggregate({
      where: { ...admissionWhere, createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amountReceived: true }
    }),
    prisma.expense.aggregate({
      where: { type: ExpenseType.DAILY, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true }
    }),
    prisma.expense.aggregate({
      where: { type: { in: [ExpenseType.AGENT, ExpenseType.CONSULTANCY] }, admission: admissionWhere, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true }
    })
  ]);

  const totalProfit = totalProfitAgg._sum.netProfit ?? 0;

  const pendingUniversityAmount = (pendingUniversity._sum.amountPayable ?? 0) - (pendingUniversity._sum.amountPaid ?? 0);
  const pendingAgentAmount = (pendingAgent._sum.commissionAmount ?? 0) - (pendingAgent._sum.amountPaid ?? 0);

  const monthlyIncome = monthlyIncomeAgg._sum.amountReceived ?? 0;
  const monthlyExpenses = (monthlyDailyExpenseAgg._sum.amount ?? 0) + (monthlyAdmissionExpenseAgg._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">Key numbers for your consultancy.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total admissions" value={String(totalAdmissions)} />
        <StatCard label="Total net profit" value={formatINR(totalProfit)} />
        <StatCard label="Pending university payment" value={formatINR(Math.max(0, pendingUniversityAmount))} />
        <StatCard label="Pending agent payment" value={formatINR(Math.max(0, pendingAgentAmount))} />
        <StatCard label="Monthly income" value={formatINR(monthlyIncome)} hint="Sum of amount received this month" />
        <StatCard label="Monthly expenses" value={formatINR(monthlyExpenses)} hint="Daily + admission-linked expenses" />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <div className="font-medium text-zinc-900">Next</div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Go to Admissions → New Admission to create an admission and auto-generate ledgers + PDF slip.</li>
          <li>Super Admin: add universities/courses first (Admin → Universities/Courses).</li>
          <li>Consultant: create agents and configure commission per course (Agents module).</li>
        </ul>
      </div>
    </div>
  );
}
