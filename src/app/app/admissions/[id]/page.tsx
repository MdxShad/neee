import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role, ExpenseType } from '@prisma/client';
import { canAccess } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatINR } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { addStudentPaymentAction } from '../actions';
import { FileUploader } from '@/components/ui/file-uploader';

function canViewAdmission(user: { id: string; role: Role; parentId: string | null }, admission: { consultantId: string; agentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) return admission.consultantId === user.id;
  if (user.role === Role.STAFF) return admission.consultantId === (user.parentId ?? '__NONE__');
  return admission.agentId === user.id;
}

export default async function AdmissionDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();

  if (user.role === Role.STAFF && !canAccess(user, 'ADMISSION_VIEW')) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        You do not have permission to view admissions.
      </div>
    );
  }

  const admission = await prisma.admission.findUnique({
    where: { id: params.id },
    include: {
      university: true,
      course: true,
      agent: true,
      consultant: true,
      expenses: true,
      universityLedger: true,
      agentLedger: true,
      profitLedger: true,
      studentPayments: { orderBy: { paidAt: "desc" } }
    }
  });

  if (!admission) return notFound();
  if (!canViewAdmission(user, admission)) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Not allowed.
      </div>
    );
  }

  const agentExpenses = admission.expenses.filter((e) => e.type === ExpenseType.AGENT);
  const consultancyExpenses = admission.expenses.filter((e) => e.type === ExpenseType.CONSULTANCY);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admission</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {admission.studentName} • {admission.course.name} • {admission.university.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/admissions" className="text-sm underline">Back</Link>
          <a href={`/api/admissions/${admission.id}/slip`} target="_blank" rel="noreferrer">
            <Button>Download Slip (PDF)</Button>
          </a>
          <a href={`/api/admissions/${admission.id}/receipt`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Download Fee Receipt</Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-500">Student</div>
              <div className="font-medium">{admission.studentName}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Father name</div>
              <div className="font-medium">{admission.fatherName ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Mobile</div>
              <div className="font-medium">{admission.mobile}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Alt mobile</div>
              <div className="font-medium">{admission.altMobile ?? '—'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-zinc-500">Address</div>
              <div className="font-medium">{admission.address ?? '—'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              {admission.source === 'DIRECT' ? <Badge>Direct</Badge> : <Badge variant="warning">Agent</Badge>}
            </div>
            {admission.agent ? (
              <div className="text-sm">
                <div className="font-medium">{admission.agent.name}</div>
                <div className="text-xs text-zinc-500">{admission.agent.userId}</div>
              </div>
            ) : (
              <div className="text-sm text-zinc-600">—</div>
            )}
            <div className="text-xs text-zinc-500">Consultant</div>
            <div className="text-sm font-medium">{admission.consultant.name}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fee & Profit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total received</span><span className="font-medium">{formatINR(admission.amountReceived)}</span></div>
            <div className="flex justify-between"><span>University payable</span><span className="font-medium">{formatINR(admission.universityFee)}</span></div>
            <div className="flex justify-between"><span>Consultancy profit</span><span className="font-medium">{formatINR(admission.consultancyProfit)}</span></div>
            <div className="flex justify-between"><span>Agent commission</span><span className="font-medium">{formatINR(admission.agentCommissionAmount)}</span></div>
            <div className="flex justify-between"><span>Agent expenses</span><span className="font-medium">{formatINR(admission.agentExpensesTotal)}</span></div>
            <div className="flex justify-between"><span>Agent profit (commission − expenses)</span><span className="font-medium">{formatINR(admission.agentCommissionAmount - admission.agentExpensesTotal)}</span></div>
            <div className="flex justify-between"><span>Consultancy expenses</span><span className="font-medium">{formatINR(admission.consultancyExpensesTotal)}</span></div>
            <div className="mt-2 border-t border-zinc-200 pt-2 flex justify-between">
              <span className="font-semibold">Final net profit</span>
              <span className="font-semibold">{formatINR(admission.netProfit)}</span>
            </div>

            <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              <div className="font-medium text-zinc-900">Formula</div>
              <div>Profit = Received − University fee</div>
              <div>Net profit = Profit − Agent commission − Agent expenses − Consultancy expenses</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ledgers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-medium">University Ledger</div>
              <div className="mt-1 flex justify-between"><span>Status</span><span className="font-medium">{admission.universityLedger?.status ?? '—'}</span></div>
              <div className="flex justify-between"><span>Paid</span><span className="font-medium">{formatINR(admission.universityLedger?.amountPaid ?? 0)}</span></div>
              <div className="flex justify-between"><span>Pending</span><span className="font-medium">{formatINR(Math.max(0, (admission.universityLedger?.amountPayable ?? 0) - (admission.universityLedger?.amountPaid ?? 0)))}</span></div>
            </div>
            <div>
              <div className="font-medium">Agent Ledger</div>
              {admission.agentLedger ? (
                <>
                  <div className="mt-1 flex justify-between"><span>Status</span><span className="font-medium">{admission.agentLedger.status}</span></div>
                  <div className="flex justify-between"><span>Paid</span><span className="font-medium">{formatINR(admission.agentLedger.amountPaid)}</span></div>
                  <div className="flex justify-between"><span>Pending</span><span className="font-medium">{formatINR(Math.max(0, admission.agentLedger.commissionAmount - admission.agentLedger.amountPaid))}</span></div>
                </>
              ) : (
                <div className="text-zinc-600">No agent ledger (direct admission).</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      
      <Card>
        <CardHeader>
          <CardTitle>Student Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.role !== Role.AGENT ? (
            <form action={addStudentPaymentAction.bind(null, admission.id)} className="grid gap-2 md:grid-cols-5">
              <Input name="amount" type="number" min={1} step={1} placeholder="Amount" required />
              <Input name="paidAt" type="date" required />
              <Textarea name="note" rows={1} placeholder="Note" />
              <FileUploader inputName="proofUrl" pathPrefix="payments/student" accept=".jpg,.jpeg,.png,.pdf" label="Upload proof" />
              <Button type="submit">Add payment</Button>
            </form>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR><TH>Date</TH><TH>Amount</TH><TH>Note</TH><TH>Proof</TH></TR>
              </THead>
              <TBody>
                {admission.studentPayments.map((p) => (
                  <TR key={p.id}>
                    <TD>{new Date(p.paidAt).toLocaleDateString()}</TD>
                    <TD>{formatINR(p.amount)}</TD>
                    <TD>{p.note ?? '—'}</TD>
                    <TD>{p.proofUrl ? <a className="underline text-sm" href={p.proofUrl} target="_blank" rel="noreferrer">Proof</a> : '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
<div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Title</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {agentExpenses.map((e) => (
                    <TR key={e.id}>
                      <TD>{e.title}</TD>
                      <TD className="text-right">{formatINR(e.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {agentExpenses.length === 0 ? <div className="text-sm text-zinc-600">No agent expenses.</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultancy Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Title</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {consultancyExpenses.map((e) => (
                    <TR key={e.id}>
                      <TD>{e.title}</TD>
                      <TD className="text-right">{formatINR(e.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            {consultancyExpenses.length === 0 ? <div className="text-sm text-zinc-600">No consultancy expenses.</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
