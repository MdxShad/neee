import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { admissionScopeWhere, csv, parseDateRange } from '@/lib/reports';

export async function GET(req: Request, { params }: { params: { type: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const { from, to } = parseDateRange({ from: url.searchParams.get('from') ?? undefined, to: url.searchParams.get('to') ?? undefined, period: url.searchParams.get('period') ?? undefined });
  const type = params.type;

  if (['profit','expenses','net-income','agents','universities'].includes(type)) {
    if (user.role === Role.AGENT) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (user.role === Role.STAFF && !(Array.isArray(user.permissions) && user.permissions.includes('ACCOUNTS_VIEW'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admissions = await prisma.admission.findMany({ where: { ...admissionScopeWhere(user), createdAt: { gte: from, lte: to } }, include: { agent: true, university: true, course: true } });
  const expenses = await prisma.expense.findMany({ where: { date: { gte: from, lte: to } } });

  let rows: string[][] = [];
  if (type === 'admissions') {
    rows = [['Date','Student','Course','Received','Net'], ...admissions.map(a=>[new Date(a.createdAt).toISOString().slice(0,10),a.studentName,a.course.name,String(a.amountReceived),String(a.netProfit)])];
  } else if (type === 'agents') {
    const m = new Map<string,[string,number,number,number]>();
    for (const a of admissions){const k=a.agentId??'DIRECT'; const prev=m.get(k)??[a.agent?`${a.agent.name} (${a.agent.userId})`:'Direct',0,0,0]; prev[1]++; prev[2]+=a.agentCommissionAmount; prev[3]+=a.netProfit; m.set(k,prev);} rows=[['Agent','Admissions','Commission','Net'], ...[...m.values()].map(v=>[v[0],String(v[1]),String(v[2]),String(v[3])])];
  } else if (type === 'universities') {
    const m = new Map<string,[string,number,number,number]>();
    for (const a of admissions){const prev=m.get(a.universityId)??[a.university.name,0,0,0]; prev[1]++; prev[2]+=a.amountReceived; prev[3]+=a.netProfit; m.set(a.universityId,prev);} rows=[['University','Admissions','Income','Net'], ...[...m.values()].map(v=>[v[0],String(v[1]),String(v[2]),String(v[3])])];
  } else if (type === 'profit') {
    const gross = admissions.reduce((s,a)=>s+a.consultancyProfit,0); const net=admissions.reduce((s,a)=>s+a.netProfit,0); rows=[['Admissions','GrossProfit','NetProfit'],[String(admissions.length),String(gross),String(net)]];
  } else if (type === 'expenses') {
    rows=[['Date','Title','Type','Amount'], ...expenses.map(e=>[new Date(e.date).toISOString().slice(0,10),e.title,e.type,String(e.amount)])];
  } else if (type === 'net-income') {
    const income=admissions.reduce((s,a)=>s+a.amountReceived,0); const expense=expenses.reduce((s,e)=>s+e.amount,0); rows=[['Income','Expenses','Net'],[String(income),String(expense),String(income-expense)]];
  } else {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  }

  return new NextResponse(csv(rows), { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${type}-report.csv"` } });
}
