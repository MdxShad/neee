import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/money';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from '@/components/ui/file-uploader';
import { addUniversityPaymentAction } from '../actions';

function scopeAdmissionWhere(user: { id: string; role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { consultantId: '__NONE__' };
}

export default async function UniversityLedgerPage() {
  const user = await requireUser();
  const canView = user.role === Role.SUPER_ADMIN || user.role === Role.CONSULTANT || (user.role === Role.STAFF && canAccess(user, 'ACCOUNTS_VIEW'));
  if (!canView) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;

  const ledgers = await prisma.universityLedger.findMany({
    where: { admission: scopeAdmissionWhere(user) },
    include: {
      university: true,
      admission: { include: { course: true } },
      payments: { orderBy: { paidAt: 'desc' } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">University Payment Ledger</h1></div>

      <Card>
        <CardHeader><CardTitle>Ledger Entries</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ledgers.map((l) => {
              const pending = Math.max(0, l.amountPayable - l.amountPaid);
              const formId = `pay-u-${l.id}`;
              return (
                <div key={l.id} className="rounded-md border border-zinc-200 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link className="text-sm underline" href={`/app/admissions/${l.admissionId}`}>{l.admission.studentName}</Link>
                      <div className="text-xs text-zinc-500">{l.university.name} • {l.admission.course.name}</div>
                    </div>
                    <div className="text-sm">Payable {formatINR(l.amountPayable)} • Paid {formatINR(l.amountPaid)} • Pending {formatINR(pending)} • {l.status === 'PAID' ? <Badge variant="success">Paid</Badge> : <Badge variant="warning">Pending</Badge>}</div>
                  </div>

                  <form id={formId} action={addUniversityPaymentAction.bind(null, l.id)} className="grid gap-2 md:grid-cols-6">
                    <Input name="amount" type="number" min={1} step={1} placeholder="Amount" required />
                    <Input name="paidAt" type="date" required />
                    <Input name="method" placeholder="Method" required />
                    <Input name="reference" placeholder="UTR/Ref" />
                    <Textarea name="notes" placeholder="Notes" rows={1} />
                    <div><FileUploader inputName="proofUrl" pathPrefix="payments/university" accept=".jpg,.jpeg,.png,.pdf" label="Upload proof" /></div>
                    <div className="md:col-span-6"><Button type="submit" size="sm">Record Payment</Button></div>
                  </form>

                  <div className="overflow-x-auto">
                    <Table>
                      <THead><TR><TH>Date</TH><TH>Amount</TH><TH>Method</TH><TH>Ref</TH><TH>Proof</TH><TH>Slip</TH></TR></THead>
                      <TBody>
                        {l.payments.map((p) => (
                          <TR key={p.id}>
                            <TD>{new Date(p.paidAt).toLocaleDateString()}</TD><TD>{formatINR(p.amount)}</TD><TD>{p.method}</TD><TD>{p.reference ?? '—'}</TD>
                            <TD>{p.proofUrl ? <a className="underline text-sm" href={p.proofUrl} target="_blank" rel="noreferrer">Proof</a> : '—'}</TD>
                            <TD><a className="underline text-sm" href={`/api/payments/${p.id}/slip`} target="_blank" rel="noreferrer">Download payment slip</a></TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
