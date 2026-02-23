import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { Role } from '@prisma/client';
import { parseDateRange } from '@/lib/reports';
import { formatINR } from '@/lib/money';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export default async function ExpensesReportPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
  const user = await requireUser();
  if (user.role === Role.STAFF && !canAccess(user, 'ACCOUNTS_VIEW')) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  if (user.role === Role.AGENT) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  const { from, to, period } = parseDateRange(searchParams ?? {});
  const expenses = await prisma.expense.findMany({ where: { date: { gte: from, lte: to } }, orderBy: { date: 'desc' } });
  const q = new URLSearchParams({ from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10), period });
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Expense report</h1><div className="flex gap-3 text-sm"><a className="underline" href={`/api/reports/expenses/csv?${q}`}>CSV</a><a className="underline" href={`/api/reports/expenses/pdf?${q}`} target="_blank" rel="noreferrer">PDF</a></div><div className="overflow-x-auto"><Table><THead><TR><TH>Date</TH><TH>Title</TH><TH>Type</TH><TH className="text-right">Amount</TH></TR></THead><TBody>{expenses.map(e=><TR key={e.id}><TD>{new Date(e.date).toLocaleDateString()}</TD><TD>{e.title}</TD><TD>{e.type}</TD><TD className="text-right">{formatINR(e.amount)}</TD></TR>)}</TBody></Table></div></div>;
}
