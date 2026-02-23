import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { Role } from '@prisma/client';
import { parseDateRange, admissionScopeWhere } from '@/lib/reports';
import { formatINR } from '@/lib/money';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export default async function AdmissionsReportPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
  const user = await requireUser();
  if (user.role === Role.STAFF && !canAccess(user, 'REPORTS_VIEW') && !canAccess(user, 'ADMISSION_VIEW')) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  const { from, to, period } = parseDateRange(searchParams ?? {});
  const admissions = await prisma.admission.findMany({ where: { ...admissionScopeWhere(user), createdAt: { gte: from, lte: to } }, include: { course: true } });
  const q = new URLSearchParams({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), period });
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Admission report</h1><div className="flex gap-3 text-sm"><a className="underline" href={`/api/reports/admissions/csv?${q}`}>CSV</a><a className="underline" href={`/api/reports/admissions/pdf?${q}`} target="_blank" rel="noreferrer">PDF</a></div><form method="get" className="grid gap-2 md:grid-cols-4"><select name="period" defaultValue={period} className="rounded border border-zinc-300 px-2 py-2 text-sm"><option value="daily">Daily</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select><input name="from" type="date" defaultValue={from.toISOString().slice(0,10)} className="rounded border border-zinc-300 px-2 py-2 text-sm" /><input name="to" type="date" defaultValue={to.toISOString().slice(0,10)} className="rounded border border-zinc-300 px-2 py-2 text-sm" /><button className="rounded border border-zinc-300 px-2 py-2 text-sm">Apply</button></form><div className="overflow-x-auto"><Table><THead><TR><TH>Date</TH><TH>Student</TH><TH>Course</TH><TH className="text-right">Received</TH><TH className="text-right">Net</TH></TR></THead><TBody>{admissions.map(a=><TR key={a.id}><TD>{new Date(a.createdAt).toLocaleDateString()}</TD><TD>{a.studentName}</TD><TD>{a.course.name}</TD><TD className="text-right">{formatINR(a.amountReceived)}</TD><TD className="text-right">{formatINR(a.netProfit)}</TD></TR>)}</TBody></Table></div></div>;
}
