import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { Role } from '@prisma/client';
import { parseDateRange, admissionScopeWhere } from '@/lib/reports';
import { formatINR } from '@/lib/money';

export default async function NetIncomeReportPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
  const user = await requireUser();
  if (user.role === Role.STAFF && !canAccess(user, 'ACCOUNTS_VIEW')) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  if (user.role === Role.AGENT) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  const { from, to, period } = parseDateRange(searchParams ?? {});
  const admissions = await prisma.admission.findMany({ where: { ...admissionScopeWhere(user), createdAt: { gte: from, lte: to } } });
  const expensesAgg = await prisma.expense.aggregate({ where: { date: { gte: from, lte: to } }, _sum: { amount: true } });
  const income = admissions.reduce((s,a)=>s+a.amountReceived,0); const expense = expensesAgg._sum.amount ?? 0; const net = income-expense;
  const q = new URLSearchParams({ from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10), period });
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Net income report</h1><div className="flex gap-3 text-sm"><a className="underline" href={`/api/reports/net-income/csv?${q}`}>CSV</a><a className="underline" href={`/api/reports/net-income/pdf?${q}`} target="_blank" rel="noreferrer">PDF</a></div><div className="rounded border border-zinc-200 p-4 text-sm"><div>Total income: <b>{formatINR(income)}</b></div><div>Total expenses: <b>{formatINR(expense)}</b></div><div>Net income: <b>{formatINR(net)}</b></div></div></div>;
}
