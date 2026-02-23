import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role, PaymentStatus } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/money';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addAgentPaymentAction } from '../actions';

function scopeWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { admission: { consultantId: user.id } };
  if (user.role === Role.STAFF) return { admission: { consultantId: user.parentId ?? '__NONE__' } };
  return { agentId: user.id };
}

export default async function AgentLedgerPage() {
  const user = await requireUser();

  const canView =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    user.role === Role.AGENT ||
    (user.role === Role.STAFF && canAccess(user, 'ACCOUNTS_VIEW'));

  if (!canView) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const ledgers = await prisma.agentLedger.findMany({
    where: scopeWhere(user),
    include: {
      agent: true,
      admission: { include: { course: true, university: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const canEdit = user.role === Role.SUPER_ADMIN || user.role === Role.CONSULTANT || (user.role === Role.STAFF && canAccess(user, 'ACCOUNTS_VIEW'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agent Ledger</h1>
        <p className="mt-1 text-sm text-zinc-600">Track agent commission paid vs pending.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Admission</TH>
                  <TH>Agent</TH>
                  <TH>Commission</TH>
                  <TH>Paid</TH>
                  <TH>Pending</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Update Payment</TH>
                </TR>
              </THead>
              <TBody>
                {ledgers.map((l) => {
                  const pending = Math.max(0, l.commissionAmount - l.amountPaid);
                  const formId = `pay-a-${l.id}`;

                  return (
                    <TR key={l.id}>
                      <TD>
                        <Link className="text-sm underline" href={`/app/admissions/${l.admissionId}`}>
                          {l.admission.studentName}
                        </Link>
                        <div className="text-xs text-zinc-500">{l.admission.course.name} • {l.admission.university.name}</div>
                      </TD>
                      <TD>
                        <div className="font-medium">{l.agent.name}</div>
                        <div className="text-xs text-zinc-500">{l.agent.userId}</div>
                      </TD>
                      <TD>{formatINR(l.commissionAmount)}</TD>
                      <TD>{formatINR(l.amountPaid)}</TD>
                      <TD>{formatINR(pending)}</TD>
                      <TD>
                        {l.status === PaymentStatus.PAID ? <Badge variant="success">PAID</Badge> : <Badge variant="warning">PENDING</Badge>}
                      </TD>
                      <TD className="text-right">
                        {canEdit ? (
                          <form id={formId} action={addAgentPaymentAction.bind(null, l.id)} className="flex justify-end gap-2">
                            <Input name="amount" form={formId} type="number" min={1} step={1} placeholder="Amount" className="h-8 w-28" />
                            <Button type="submit" size="sm" variant="secondary">Add</Button>
                          </form>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>

          {ledgers.length === 0 ? <div className="text-sm text-zinc-600">No agent ledger entries yet.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
