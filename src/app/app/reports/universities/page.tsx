import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { Role } from '@prisma/client';
import { parseDateRange, admissionScopeWhere } from '@/lib/reports';
import { formatINR } from '@/lib/money';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export default async function UniversitiesReportPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
  const user = await requireUser();
  if (user.role === Role.STAFF && !canAccess(user, 'ACCOUNTS_VIEW')) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  if (user.role === Role.AGENT) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  const { from, to, period } = parseDateRange(searchParams ?? {});
  const admissions = await prisma.admission.findMany({ where: { ...admissionScopeWhere(user), createdAt: { gte: from, lte: to } }, include: { university: true } });
  const m = new Map<string,{name:string;count:number;income:number;net:number}>();
  for (const a of admissions){const k=a.universityId; const r=m.get(k)??{name:a.university.name,count:0,income:0,net:0}; r.count++; r.income+=a.amountReceived; r.net+=a.netProfit; m.set(k,r);} 
  const q = new URLSearchParams({ from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10), period });
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">University-wise report</h1><div className="flex gap-3 text-sm"><a className="underline" href={`/api/reports/universities/csv?${q}`}>CSV</a><a className="underline" href={`/api/reports/universities/pdf?${q}`} target="_blank" rel="noreferrer">PDF</a></div><div className="overflow-x-auto"><Table><THead><TR><TH>University</TH><TH className="text-right">Admissions</TH><TH className="text-right">Income</TH><TH className="text-right">Net Profit</TH></TR></THead><TBody>{[...m.values()].map(r=><TR key={r.name}><TD>{r.name}</TD><TD className="text-right">{r.count}</TD><TD className="text-right">{formatINR(r.income)}</TD><TD className="text-right">{formatINR(r.net)}</TD></TR>)}</TBody></Table></div></div>;
}
