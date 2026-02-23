import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatINR } from '@/lib/money';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { admission: { consultantId: user.id } };
  if (user.role === Role.STAFF) return { admission: { consultantId: user.parentId ?? '__NONE__' } };
  return { admission: { consultantId: '__NONE__' } };
}

export default async function ProfitLedgerPage() {
  const user = await requireUser();

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'ACCOUNTS_VIEW'));

  if (!canView) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const rows = await prisma.profitLedger.findMany({
    where: scopeWhere(user),
    include: {
      admission: { include: { course: true, university: true, agent: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consultancy Profit Ledger</h1>
        <p className="mt-1 text-sm text-zinc-600">Gross profit, expenses and final net profit per admission.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Admission</TH>
                  <TH>Course</TH>
                  <TH>Gross Profit</TH>
                  <TH>Agent Commission</TH>
                  <TH>Expenses</TH>
                  <TH>Net Profit</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link className="text-sm underline" href={`/app/admissions/${r.admissionId}`}>
                        {r.admission.studentName}
                      </Link>
                      <div className="text-xs text-zinc-500">{r.admission.university.name}</div>
                    </TD>
                    <TD>
                      <div className="font-medium">{r.admission.course.name}</div>
                      <div className="text-xs text-zinc-500">{r.admission.agent ? `Agent: ${r.admission.agent.name}` : 'Direct'}</div>
                    </TD>
                    <TD>{formatINR(r.grossProfit)}</TD>
                    <TD>{formatINR(r.agentCommission)}</TD>
                    <TD>
                      <div>Agent exp: {formatINR(r.agentExpenses)}</div>
                      <div className="text-xs text-zinc-500">Consultancy exp: {formatINR(r.consultancyExpenses)}</div>
                    </TD>
                    <TD className="font-medium">{formatINR(r.netProfit)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {rows.length === 0 ? <div className="text-sm text-zinc-600">No profit entries yet.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
