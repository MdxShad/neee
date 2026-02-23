'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ExpenseType, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { canAccess } from '@/lib/roles';

export async function addDailyExpenseAction(formData: FormData) {
  const user = await requireUser();

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'EXPENSE_ADD'));

  if (!allowed) throw new Error('Not allowed');

  const title = String(formData.get('title') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const proofUrl = String(formData.get('proofUrl') ?? '').trim();
  const amount = Number(formData.get('amount') ?? 0);

  if (title.length < 1) throw new Error('Title required');
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid amount');

  await prisma.expense.create({
    data: {
      type: ExpenseType.DAILY,
      category: category || null,
      title,
      amount: Math.trunc(amount),
      proofUrl: proofUrl || null,
      date: new Date(),
      createdById: user.id
    }
  });

  revalidatePath('/app/expenses/daily');
  revalidatePath('/app');
}

export async function deleteDailyExpenseAction(id: string) {
  const user = await requireUser();

  const allowed =
    user.role === Role.SUPER_ADMIN ||
    user.role === Role.CONSULTANT ||
    (user.role === Role.STAFF && canAccess(user, 'EXPENSE_ADD'));

  if (!allowed) throw new Error('Not allowed');

  const expense = await prisma.expense.findUnique({ where: { id }, select: { createdById: true, type: true } });
  if (!expense || expense.type !== ExpenseType.DAILY) return;

  // Scope: consultants can delete their own + their staff expenses
  if (user.role === Role.CONSULTANT) {
    const createdBy = await prisma.user.findUnique({ where: { id: expense.createdById ?? '' }, select: { id: true, parentId: true } });
    if (createdBy && createdBy.id !== user.id && createdBy.parentId !== user.id) throw new Error('Not allowed');
  }
  if (user.role === Role.STAFF) {
    const createdBy = await prisma.user.findUnique({ where: { id: expense.createdById ?? '' }, select: { parentId: true, id: true } });
    if (createdBy && createdBy.parentId !== (user.parentId ?? '__NONE__') && createdBy.id !== user.parentId) throw new Error('Not allowed');
  }

  await prisma.expense.delete({ where: { id } });
  revalidatePath('/app/expenses/daily');
  revalidatePath('/app');
}
