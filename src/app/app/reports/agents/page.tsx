import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { canAccess } from '@/lib/roles';
import { Role } from '@prisma/client';
import { parseDateRange, admissionScopeWhere } from '@/lib/reports';
import { formatINR } from '@/lib/money';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export default async function AgentsReportPage({ searchParams }: { searchParams?: { from?: string; to?: string; period?: string } }) {
  const user = await requireUser();
  if (user.role === Role.STAFF && !canAccess(user, 'ACCOUNTS_VIEW')) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  if (user.role === Role.AGENT) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  const { from, to, period } = parseDateRange(searchParams ?? {});
  const admissions = await prisma.admission.findMany({ where: { ...admissionScopeWhere(user), createdAt: { gte: from, lte: to } }, include: { agent: true } });
  const m = new Map<string,{name:string;count:number;commission:number;net:number}>();
  for (const a of admissions){const k=a.agentId??'DIRECT'; const r=m.get(k)??{name:a.agent?`${a.agent.name} (${a.agent.userId})`:'Direct',count:0,commission:0,net:0}; r.count++; r.commission+=a.agentCommissionAmount; r.net+=a.netProfit; m.set(k,r);} 
  const q = new URLSearchParams({ from: from.toISOString().slice(0,10), to: to.toISOString().slice(0,10), period });
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Agent-wise report</h1><div className="flex gap-3 text-sm"><a className="underline" href={`/api/reports/agents/csv?${q}`}>CSV</a><a className="underline" href={`/api/reports/agents/pdf?${q}`} target="_blank" rel="noreferrer">PDF</a></div><div className="overflow-x-auto"><Table><THead><TR><TH>Agent</TH><TH className="text-right">Admissions</TH><TH className="text-right">Commission</TH><TH className="text-right">Net Profit</TH></TR></THead><TBody>{[...m.values()].map(r=><TR key={r.name}><TD>{r.name}</TD><TD className="text-right">{r.count}</TD><TD className="text-right">{formatINR(r.commission)}</TD><TD className="text-right">{formatINR(r.net)}</TD></TR>)}</TBody></Table></div></div>;
}
