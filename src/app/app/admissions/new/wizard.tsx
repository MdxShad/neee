'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AdmissionSource, CommissionType, Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/money';
import { calculateAdmissionFinancials } from '@/lib/calculations';
import { createAdmissionAction } from '../actions';

type SimpleUniversity = { id: string; name: string };
type SimpleCourse = { id: string; universityId: string; name: string; universityFee: number; displayFee: number };
type SimpleAgent = { id: string; parentId: string | null; name: string; userId: string };
type SimpleConsultant = { id: string; name: string; userId: string };

type SimpleCommission = { agentId: string; courseId: string; type: CommissionType; value: number };

type ExpenseRow = { title: string; amount: number; proofUrl?: string };

function StepPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={active ? 'rounded-full bg-zinc-900 px-3 py-1 text-xs text-white' : 'rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700'}>
      {label}
    </div>
  );
}

export function AdmissionWizard(props: {
  me: { id: string; role: Role; parentId: string | null };
  consultants: SimpleConsultant[];
  universities: SimpleUniversity[];
  courses: SimpleCourse[];
  agents: SimpleAgent[];
  commissions: SimpleCommission[];
}) {
  const router = useRouter();

  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, startSubmitting] = React.useTransition();

  const [consultantId, setConsultantId] = React.useState<string>(props.consultants[0]?.id ?? '');

  // Step 1
  const [studentName, setStudentName] = React.useState('');
  const [fatherName, setFatherName] = React.useState('');
  const [mobile, setMobile] = React.useState('');
  const [altMobile, setAltMobile] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [dob, setDob] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [photoUrl, setPhotoUrl] = React.useState('');
  const [documentsText, setDocumentsText] = React.useState('');

  // Step 2
  const [universityId, setUniversityId] = React.useState('');
  const [courseId, setCourseId] = React.useState('');

  // Step 3
  const [amountReceived, setAmountReceived] = React.useState<number>(0);

  // Step 4
  const [source, setSource] = React.useState<AdmissionSource>(AdmissionSource.DIRECT);
  const [agentId, setAgentId] = React.useState('');

  // Step 5
  const [agentExpenses, setAgentExpenses] = React.useState<ExpenseRow[]>([]);
  const [consultancyExpenses, setConsultancyExpenses] = React.useState<ExpenseRow[]>([]);

  const coursesForUniversity = React.useMemo(() => {
    if (!universityId) return [];
    return props.courses.filter((c) => c.universityId === universityId);
  }, [props.courses, universityId]);

  const selectedCourse = React.useMemo(() => {
    return props.courses.find((c) => c.id === courseId) ?? null;
  }, [props.courses, courseId]);

  const consultantScopedAgents = React.useMemo(() => {
    if (props.me.role !== Role.SUPER_ADMIN) return props.agents;
    if (!consultantId) return props.agents;
    return props.agents.filter((a) => a.parentId === consultantId);
  }, [props.me.role, props.agents, consultantId]);

  const commissionConfig = React.useMemo(() => {
    if (source !== AdmissionSource.AGENT) return { type: 'NONE' as const };
    if (!agentId || !selectedCourse) return { type: 'NONE' as const };
    const c = props.commissions.find((x) => x.agentId === agentId && x.courseId === selectedCourse.id);
    if (!c) return { type: 'NONE' as const };
    return { type: c.type, value: c.value };
  }, [source, agentId, selectedCourse, props.commissions]);

  const expenseTotals = React.useMemo(() => {
    const a = agentExpenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
    const c = consultancyExpenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
    return { agent: a, consultancy: c };
  }, [agentExpenses, consultancyExpenses]);

  const financials = React.useMemo(() => {
    const universityFee = selectedCourse?.universityFee ?? 0;
    return calculateAdmissionFinancials({
      amountReceived,
      universityFee,
      agentCommission: commissionConfig,
      agentExpensesTotal: expenseTotals.agent,
      consultancyExpensesTotal: expenseTotals.consultancy
    });
  }, [amountReceived, selectedCourse, commissionConfig, expenseTotals]);

  const pendingFee = React.useMemo(() => {
    const displayFee = selectedCourse?.displayFee ?? 0;
    return Math.max(0, displayFee - amountReceived);
  }, [selectedCourse, amountReceived]);

  function next() {
    setError(null);
    setStep((s) => Math.min(6, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function normalizeDocs(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function addExpense(setter: React.Dispatch<React.SetStateAction<ExpenseRow[]>>) {
    setter((rows) => [...rows, { title: '', amount: 0, proofUrl: '' }]);
  }

  function updateExpense(setter: React.Dispatch<React.SetStateAction<ExpenseRow[]>>, index: number, patch: Partial<ExpenseRow>) {
    setter((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeExpense(setter: React.Dispatch<React.SetStateAction<ExpenseRow[]>>, index: number) {
    setter((rows) => rows.filter((_, i) => i !== index));
  }

  function validateStep(): string | null {
    if (props.me.role === Role.SUPER_ADMIN && !consultantId) return 'Select a consultant.';

    if (step === 1) {
      if (studentName.trim().length < 2) return 'Student name is required.';
      if (mobile.trim().length < 5) return 'Mobile is required.';
      return null;
    }

    if (step === 2) {
      if (!universityId) return 'Select a university.';
      if (!courseId) return 'Select a course.';
      return null;
    }

    if (step === 3) {
      if (!selectedCourse) return 'Select course first.';
      if (amountReceived < 0) return 'Amount received cannot be negative.';
      return null;
    }

    if (step === 4) {
      if (source === AdmissionSource.AGENT && !agentId) return 'Select an agent.';
      return null;
    }

    return null;
  }

  function nextWithValidation() {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    next();
  }

  function submit() {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    if (!selectedCourse) {
      setError('Course is required.');
      return;
    }

    startSubmitting(async () => {
      setError(null);
      try {
        const res = await createAdmissionAction({
          consultantId: props.me.role === Role.SUPER_ADMIN ? consultantId : '',
          studentName,
          fatherName,
          mobile,
          altMobile,
          address,
          dob,
          gender,
          photoUrl,
          documents: normalizeDocs(documentsText),
          universityId,
          courseId,
          amountReceived,
          source,
          agentId: source === AdmissionSource.AGENT ? agentId : '',
          agentExpenses: agentExpenses.map((e) => ({ title: e.title, amount: e.amount, proofUrl: e.proofUrl || '' })),
          consultancyExpenses: consultancyExpenses.map((e) => ({ title: e.title, amount: e.amount, proofUrl: e.proofUrl || '' }))
        });
        router.push(`/app/admissions/${res.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create admission');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Admission</h1>
        <p className="mt-1 text-sm text-zinc-600">Step-by-step admission form with automatic calculations.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StepPill active={step === 1} label="1. Student" />
        <StepPill active={step === 2} label="2. Course" />
        <StepPill active={step === 3} label="3. Fee" />
        <StepPill active={step === 4} label="4. Source" />
        <StepPill active={step === 5} label="5. Expenses" />
        <StepPill active={step === 6} label="6. Review" />
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {props.me.role === Role.SUPER_ADMIN ? (
        <Card>
          <CardHeader>
            <CardTitle>Consultant</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Consultant</Label>
              <Select value={consultantId} onChange={(e) => setConsultantId(e.target.value)}>
                <option value="" disabled>Select consultant</option>
                {props.consultants.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.userId})</option>
                ))}
              </Select>
            </div>
            <div className="text-xs text-zinc-600 md:self-end">
              Admissions are stored under the selected consultant.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Student Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Student Name</Label>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Father Name</Label>
              <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mobile</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Alt Mobile</Label>
              <Input value={altMobile} onChange={(e) => setAltMobile(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>DOB (YYYY-MM-DD)</Label>
              <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="2005-01-31" />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Photo URL (optional)</Label>
              <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Documents (optional — one URL per line)</Label>
              <Textarea value={documentsText} onChange={(e) => setDocumentsText(e.target.value)} placeholder="https://…\nhttps://…" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Course Selection</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>University</Label>
              <Select
                value={universityId}
                onChange={(e) => {
                  setUniversityId(e.target.value);
                  setCourseId('');
                }}
              >
                <option value="" disabled>Select university</option>
                {props.universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Course</Label>
              <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="" disabled>Select course</option>
                {coursesForUniversity.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              {selectedCourse ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>University fee: {formatINR(selectedCourse.universityFee)}</Badge>
                  <Badge>Display fee: {formatINR(selectedCourse.displayFee)}</Badge>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 && selectedCourse ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 — Fee Entry</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Actual fee taken from student</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={Number.isFinite(amountReceived) ? amountReceived : 0}
                onChange={(e) => setAmountReceived(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <Label>Consultancy profit (auto)</Label>
              <Input value={formatINR(financials.consultancyProfit)} readOnly />
            </div>

            <div className="md:col-span-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <div className="font-medium text-zinc-900">Auto</div>
              <div>Profit = {formatINR(amountReceived)} − {formatINR(selectedCourse.universityFee)} = {formatINR(financials.consultancyProfit)}</div>
              <div>Pending fee (vs display fee) = {formatINR(pendingFee)}</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 4 — Admission Source</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Source</Label>
              <Select
                value={source}
                onChange={(e) => {
                  const v = e.target.value as AdmissionSource;
                  setSource(v);
                  if (v === AdmissionSource.DIRECT) setAgentId('');
                }}
              >
                <option value={AdmissionSource.DIRECT}>Direct consultancy</option>
                <option value={AdmissionSource.AGENT}>Agent</option>
              </Select>
            </div>

            {source === AdmissionSource.AGENT ? (
              <div className="space-y-1 md:col-span-2">
                <Label>Agent</Label>
                <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="" disabled>Select agent</option>
                  {consultantScopedAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.userId})</option>
                  ))}
                </Select>

                <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                  <div className="font-medium text-zinc-900">Auto agent commission</div>
                  <div>
                    {commissionConfig.type === 'NONE' ? (
                      <span className="text-zinc-600">No commission configured for this agent + course. Commission will be ₹0.</span>
                    ) : (
                      <>
                        Type: <b>{commissionConfig.type}</b>, Value: <b>{(commissionConfig as any).value}</b>
                      </>
                    )}
                  </div>
                  <div>Commission amount (auto): <b>{formatINR(financials.agentCommissionAmount)}</b></div>
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 text-sm text-zinc-600">Direct admission (no agent commission).</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Agent Expenses</div>
                  <div className="text-xs text-zinc-600">Optional. Will reduce agent profit and consultancy net profit.</div>
                </div>
                <Button type="button" variant="secondary" onClick={() => addExpense(setAgentExpenses)}>Add</Button>
              </div>

              {agentExpenses.length === 0 ? <div className="text-sm text-zinc-600">No agent expenses.</div> : null}

              <div className="space-y-3">
                {agentExpenses.map((row, idx) => (
                  <div key={idx} className="grid gap-2 rounded-md border border-zinc-200 p-3 md:grid-cols-6">
                    <div className="md:col-span-3">
                      <Label>Title</Label>
                      <Input value={row.title} onChange={(e) => updateExpense(setAgentExpenses, idx, { title: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Amount</Label>
                      <Input type="number" min={0} step={1} value={row.amount} onChange={(e) => updateExpense(setAgentExpenses, idx, { amount: Number(e.target.value) })} />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button type="button" variant="ghost" onClick={() => removeExpense(setAgentExpenses, idx)}>Remove</Button>
                    </div>
                    <div className="md:col-span-6">
                      <Label>Proof URL (optional)</Label>
                      <Input value={row.proofUrl ?? ''} onChange={(e) => updateExpense(setAgentExpenses, idx, { proofUrl: e.target.value })} placeholder="https://…" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-sm">Total agent expenses: <b>{formatINR(expenseTotals.agent)}</b></div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Consultancy Expenses</div>
                  <div className="text-xs text-zinc-600">Optional. Will reduce consultancy net profit.</div>
                </div>
                <Button type="button" variant="secondary" onClick={() => addExpense(setConsultancyExpenses)}>Add</Button>
              </div>

              {consultancyExpenses.length === 0 ? <div className="text-sm text-zinc-600">No consultancy expenses.</div> : null}

              <div className="space-y-3">
                {consultancyExpenses.map((row, idx) => (
                  <div key={idx} className="grid gap-2 rounded-md border border-zinc-200 p-3 md:grid-cols-6">
                    <div className="md:col-span-3">
                      <Label>Title</Label>
                      <Input value={row.title} onChange={(e) => updateExpense(setConsultancyExpenses, idx, { title: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Amount</Label>
                      <Input type="number" min={0} step={1} value={row.amount} onChange={(e) => updateExpense(setConsultancyExpenses, idx, { amount: Number(e.target.value) })} />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button type="button" variant="ghost" onClick={() => removeExpense(setConsultancyExpenses, idx)}>Remove</Button>
                    </div>
                    <div className="md:col-span-6">
                      <Label>Proof URL (optional)</Label>
                      <Input value={row.proofUrl ?? ''} onChange={(e) => updateExpense(setConsultancyExpenses, idx, { proofUrl: e.target.value })} placeholder="https://…" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-sm">Total consultancy expenses: <b>{formatINR(expenseTotals.consultancy)}</b></div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 6 — Final Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-zinc-500">Student</div>
                <div className="font-medium">{studentName || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Mobile</div>
                <div className="font-medium">{mobile || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">University</div>
                <div className="font-medium">{props.universities.find((u) => u.id === universityId)?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Course</div>
                <div className="font-medium">{selectedCourse?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Source</div>
                <div className="font-medium">{source === AdmissionSource.DIRECT ? 'Direct' : 'Agent'}</div>
              </div>
              {source === AdmissionSource.AGENT ? (
                <div>
                  <div className="text-xs text-zinc-500">Agent</div>
                  <div className="font-medium">{consultantScopedAgents.find((a) => a.id === agentId)?.name ?? '—'}</div>
                </div>
              ) : null}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span>Total received</span><span className="font-medium">{formatINR(amountReceived)}</span></div>
                <div className="flex justify-between"><span>University payable</span><span className="font-medium">{formatINR(selectedCourse?.universityFee ?? 0)}</span></div>
                <div className="flex justify-between"><span>Consultancy profit</span><span className="font-medium">{formatINR(financials.consultancyProfit)}</span></div>
                <div className="flex justify-between"><span>Agent commission</span><span className="font-medium">{formatINR(financials.agentCommissionAmount)}</span></div>
                <div className="flex justify-between"><span>Agent expenses</span><span className="font-medium">{formatINR(expenseTotals.agent)}</span></div>
                <div className="flex justify-between"><span>Agent profit (commission − expenses)</span><span className="font-medium">{formatINR(financials.agentCommissionAmount - expenseTotals.agent)}</span></div>
                <div className="flex justify-between"><span>Consultancy expenses</span><span className="font-medium">{formatINR(expenseTotals.consultancy)}</span></div>
                <div className="mt-2 border-t border-zinc-200 pt-2 flex justify-between">
                  <span className="font-semibold">Final net profit</span>
                  <span className="font-semibold">{formatINR(financials.netProfit)}</span>
                </div>
                <div className="text-xs text-zinc-600">Pending fee vs display fee: {formatINR(pendingFee)}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Ledger entries will be created on submit</Badge>
              <Badge>Admission slip PDF will be available immediately</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={back} disabled={submitting}>Back</Button>
              <Button type="button" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Admission'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step !== 6 ? (
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={back} disabled={step === 1}>Back</Button>
          <Button type="button" onClick={nextWithValidation}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}
