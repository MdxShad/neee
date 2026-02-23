'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { PaymentStatus, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canAccess } from '@/lib/roles';

function ensureCanEdit(user: { role: Role; parentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return;
  if (user.role === Role.CONSULTANT) return;
  if (user.role === Role.STAFF && canAccess(user as any, 'ACCOUNTS_VIEW')) return;
  throw new Error('Not allowed');
}

export async function addUniversityPaymentAction(ledgerId: string, formData: FormData) {
  const user = await requireUser();
  ensureCanEdit(user);

  const amount = Number(formData.get('amount') ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');

  const ledger = await prisma.universityLedger.findUnique({
    where: { id: ledgerId },
    include: { admission: true }
  });
  if (!ledger) return;

  // Scope check
  if (user.role === Role.CONSULTANT && ledger.admission.consultantId !== user.id) throw new Error('Not allowed');
  if (user.role === Role.STAFF && ledger.admission.consultantId !== (user.parentId ?? '__NONE__')) throw new Error('Not allowed');

  const newPaid = ledger.amountPaid + Math.trunc(amount);
  const status = newPaid >= ledger.amountPayable ? PaymentStatus.PAID : PaymentStatus.PENDING;

  await prisma.universityLedger.update({
    where: { id: ledgerId },
    data: { amountPaid: newPaid, status }
  });

  revalidatePath('/app/ledgers/university');
  revalidatePath(`/app/admissions/${ledger.admissionId}`);
}

export async function addAgentPaymentAction(ledgerId: string, formData: FormData) {
  const user = await requireUser();
  ensureCanEdit(user);

  const amount = Number(formData.get('amount') ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');

  const ledger = await prisma.agentLedger.findUnique({
    where: { id: ledgerId },
    include: { admission: true }
  });
  if (!ledger) return;

  // Scope check
  if (user.role === Role.CONSULTANT && ledger.admission.consultantId !== user.id) throw new Error('Not allowed');
  if (user.role === Role.STAFF && ledger.admission.consultantId !== (user.parentId ?? '__NONE__')) throw new Error('Not allowed');

  const newPaid = ledger.amountPaid + Math.trunc(amount);
  const status = newPaid >= ledger.commissionAmount ? PaymentStatus.PAID : PaymentStatus.PENDING;

  await prisma.agentLedger.update({
    where: { id: ledgerId },
    data: { amountPaid: newPaid, status }
  });

  revalidatePath('/app/ledgers/agent');
  revalidatePath(`/app/admissions/${ledger.admissionId}`);
}
