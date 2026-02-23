import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { Role } from '@prisma/client';
import { parseDateRange, admissionScopeWhere } from '@/lib/reports';
import { formatINR } from '@/lib/money';

export default async function ProfitReportPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
  const user = await requireUser();
  if (user.role === Role.STAFF && !canAccess(user, 'ACCOUNTS_VIEW')) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  if (user.role === Role.AGENT) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  const { from, to, period } = parseDateRange(searchParams ?? {});
  const admissions = await prisma.admission.findMany({ where: { ...admissionScopeWhere(user), createdAt: { gte: from, lte: to } } });
  const gross = admissions.reduce((s,a)=>s+a.consultancyProfit,0); const net = admissions.reduce((s,a)=>s+a.netProfit,0);
  const q = new URLSearchParams({ from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10), period });
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Profit report</h1><div className="flex gap-3 text-sm"><a className="underline" href={`/api/reports/profit/csv?${q}`}>CSV</a><a className="underline" href={`/api/reports/profit/pdf?${q}`} target="_blank" rel="noreferrer">PDF</a></div><div className="rounded border border-zinc-200 p-4 text-sm"><div>Admissions: <b>{admissions.length}</b></div><div>Gross profit: <b>{formatINR(gross)}</b></div><div>Net profit: <b>{formatINR(net)}</b></div></div></div>;
}
