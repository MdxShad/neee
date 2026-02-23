'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { PaymentStatus, PaymentType, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canAccess } from '@/lib/roles';
import { ledgerPaymentSchema } from '@/lib/validation';

function ensureCanEdit(user: { role: Role; parentId: string | null; permissions: unknown | null }) {
  if (user.role === Role.SUPER_ADMIN) return;
  if (user.role === Role.CONSULTANT) return;
  if (user.role === Role.STAFF && canAccess(user as any, 'ACCOUNTS_VIEW')) return;
  throw new Error('Not allowed');
}

export async function addUniversityPaymentAction(ledgerId: string, formData: FormData) {
  const user = await requireUser();
  ensureCanEdit(user);

  const parsed = ledgerPaymentSchema.safeParse({
    amount: formData.get('amount') ?? 0,
    paidAt: String(formData.get('paidAt') ?? ''),
    method: String(formData.get('method') ?? ''),
    reference: String(formData.get('reference') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    proofUrl: String(formData.get('proofUrl') ?? '')
  });
  if (!parsed.success) throw new Error('Invalid payment data');

  const ledger = await prisma.universityLedger.findUnique({ where: { id: ledgerId }, include: { admission: true } });
  if (!ledger) return;

  if (user.role === Role.CONSULTANT && ledger.admission.consultantId !== user.id) throw new Error('Not allowed');
  if (user.role === Role.STAFF && ledger.admission.consultantId !== (user.parentId ?? '__NONE__')) throw new Error('Not allowed');

  await prisma.payment.create({
    data: {
      type: PaymentType.UNIVERSITY,
      ledgerId,
      universityLedgerId: ledgerId,
      amount: parsed.data.amount,
      paidAt: new Date(parsed.data.paidAt),
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
      proofUrl: parsed.data.proofUrl,
      createdById: user.id
    }
  });

  const agg = await prisma.payment.aggregate({ where: { universityLedgerId: ledgerId }, _sum: { amount: true } });
  const amountPaid = agg._sum.amount ?? 0;
  const status = amountPaid >= ledger.amountPayable ? PaymentStatus.PAID : PaymentStatus.PENDING;
  await prisma.universityLedger.update({ where: { id: ledgerId }, data: { amountPaid, status } });

  revalidatePath('/app/ledgers/university');
  revalidatePath(`/app/admissions/${ledger.admissionId}`);
}

export async function addAgentPaymentAction(ledgerId: string, formData: FormData) {
  const user = await requireUser();
  ensureCanEdit(user);

  const parsed = ledgerPaymentSchema.safeParse({
    amount: formData.get('amount') ?? 0,
    paidAt: String(formData.get('paidAt') ?? ''),
    method: String(formData.get('method') ?? ''),
    reference: String(formData.get('reference') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    proofUrl: String(formData.get('proofUrl') ?? '')
  });
  if (!parsed.success) throw new Error('Invalid payment data');

  const ledger = await prisma.agentLedger.findUnique({ where: { id: ledgerId }, include: { admission: true } });
  if (!ledger) return;

  if (user.role === Role.CONSULTANT && ledger.admission.consultantId !== user.id) throw new Error('Not allowed');
  if (user.role === Role.STAFF && ledger.admission.consultantId !== (user.parentId ?? '__NONE__')) throw new Error('Not allowed');

  await prisma.payment.create({
    data: {
      type: PaymentType.AGENT,
      ledgerId,
      agentLedgerId: ledgerId,
      amount: parsed.data.amount,
      paidAt: new Date(parsed.data.paidAt),
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
      proofUrl: parsed.data.proofUrl,
      createdById: user.id
    }
  });

  const agg = await prisma.payment.aggregate({ where: { agentLedgerId: ledgerId }, _sum: { amount: true } });
  const amountPaid = agg._sum.amount ?? 0;
  const status = amountPaid >= ledger.commissionAmount ? PaymentStatus.PAID : PaymentStatus.PENDING;
  await prisma.agentLedger.update({ where: { id: ledgerId }, data: { amountPaid, status } });

  revalidatePath('/app/ledgers/agent');
  revalidatePath(`/app/admissions/${ledger.admissionId}`);
}
