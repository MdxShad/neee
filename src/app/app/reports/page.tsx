import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ExpenseType, Role } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { formatINR } from '@/lib/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function scopeAdmissionWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { agentId: user.id };
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams: { from?: string; to?: string };
}) {
  const user = await requireUser();

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'REPORTS_VIEW'));

  if (!canView) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>
    );
  }

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = searchParams.from ? new Date(searchParams.from) : defaultFrom;
  const to = searchParams.to ? new Date(searchParams.to) : now;
  const validFrom = Number.isNaN(from.getTime()) ? defaultFrom : from;
  const validTo = Number.isNaN(to.getTime()) ? now : to;

  const admissions = await prisma.admission.findMany({
    where: { ...scopeAdmissionWhere(user), createdAt: { gte: validFrom, lte: validTo } },
    include: { agent: true, university: true, course: true },
    orderBy: { createdAt: 'desc' }
  });

  const admissionExpenses = await prisma.expense.findMany({
    where: {
      type: { in: [ExpenseType.AGENT, ExpenseType.CONSULTANCY] },
      admission: scopeAdmissionWhere(user),
      date: { gte: validFrom, lte: validTo }
    }
  });

  const totalAdmissions = admissions.length;
  const totalIncome = admissions.reduce((s, a) => s + a.amountReceived, 0);
  const totalNetProfit = admissions.reduce((s, a) => s + a.netProfit, 0);
  const totalAgentCommission = admissions.reduce((s, a) => s + a.agentCommissionAmount, 0);
  const totalAdmissionExpenses = admissionExpenses.reduce((s, e) => s + e.amount, 0);

  const agentWise = new Map<string, { name: string; count: number; commission: number; netProfit: number }>();
  const uniWise = new Map<string, { name: string; count: number; income: number; netProfit: number }>();

  for (const a of admissions) {
    const agentKey = a.agentId ?? 'DIRECT';
    const agentName = a.agent ? `${a.agent.name} (${a.agent.userId})` : 'Direct';
    const ar = agentWise.get(agentKey) ?? { name: agentName, count: 0, commission: 0, netProfit: 0 };
    ar.count += 1;
    ar.commission += a.agentCommissionAmount;
    ar.netProfit += a.netProfit;
    agentWise.set(agentKey, ar);

    const uniKey = a.universityId;
    const ur = uniWise.get(uniKey) ?? { name: a.university.name, count: 0, income: 0, netProfit: 0 };
    ur.count += 1;
    ur.income += a.amountReceived;
    ur.netProfit += a.netProfit;
    uniWise.set(uniKey, ur);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-zinc-600">Basic reporting for admissions and profitability.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" method="get">
            <div>
              <div className="text-sm font-medium">From</div>
              <Input name="from" type="date" defaultValue={validFrom.toISOString().slice(0, 10)} />
            </div>
            <div>
              <div className="text-sm font-medium">To</div>
              <Input name="to" type="date" defaultValue={validTo.toISOString().slice(0, 10)} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Total admissions</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalAdmissions}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total income</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalIncome)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total net profit</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalNetProfit)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Admission expenses</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(totalAdmissionExpenses)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent-wise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Agent</TH>
                  <TH className="text-right">Admissions</TH>
                  <TH className="text-right">Commission</TH>
                  <TH className="text-right">Net profit</TH>
                </TR>
              </THead>
              <TBody>
                {[...agentWise.values()].map((r) => (
                  <TR key={r.name}>
                    <TD>{r.name}</TD>
                    <TD className="text-right">{r.count}</TD>
                    <TD className="text-right">{formatINR(r.commission)}</TD>
                    <TD className="text-right">{formatINR(r.netProfit)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>University-wise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>University</TH>
                  <TH className="text-right">Admissions</TH>
                  <TH className="text-right">Income</TH>
                  <TH className="text-right">Net profit</TH>
                </TR>
              </THead>
              <TBody>
                {[...uniWise.values()].map((r) => (
                  <TR key={r.name}>
                    <TD>{r.name}</TD>
                    <TD className="text-right">{r.count}</TD>
                    <TD className="text-right">{formatINR(r.income)}</TD>
                    <TD className="text-right">{formatINR(r.netProfit)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admission list</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Student</TH>
                  <TH>Course</TH>
                  <TH className="text-right">Received</TH>
                  <TH className="text-right">Net profit</TH>
                </TR>
              </THead>
              <TBody>
                {admissions.map((a) => (
                  <TR key={a.id}>
                    <TD>{new Date(a.createdAt).toLocaleDateString()}</TD>
                    <TD>{a.studentName}</TD>
                    <TD>{a.course.name}</TD>
                    <TD className="text-right">{formatINR(a.amountReceived)}</TD>
                    <TD className="text-right">{formatINR(a.netProfit)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <div className="font-medium text-zinc-900">Note</div>
        <p className="mt-1">This is the MVP report page. Detailed PDF report exports can be added in the next milestone.</p>
      </div>
    </div>
  );
}
