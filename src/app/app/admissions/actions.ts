'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createAdmissionSchema } from '@/lib/validation';
import { AdmissionSource, AdmissionStatus, CommissionType, ExpenseType, PaymentStatus, Role } from '@prisma/client';
import { calculateAdmissionFinancials } from '@/lib/calculations';
import { revalidatePath } from 'next/cache';

export async function createAdmissionAction(payload: unknown): Promise<{ id: string }> {
  const user = await requireUser();

  // Security rule: Agent cannot create admissions
  if (user.role === Role.AGENT) {
    throw new Error('Agent is not allowed to create admissions.');
  }

  const parsed = createAdmissionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('Invalid admission payload');
  }

  const data = parsed.data;

  // Resolve consultant scope
  let consultantId: string;
  if (user.role === Role.CONSULTANT) {
    consultantId = user.id;
  } else if (user.role === Role.STAFF) {
    if (!user.parentId) throw new Error('Staff is not assigned to any consultant.');
    consultantId = user.parentId;
  } else {
    // SUPER_ADMIN
    if (!data.consultantId) throw new Error('Consultant is required for Super Admin admissions.');
    consultantId = data.consultantId;
  }

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    include: { university: true }
  });
  if (!course) throw new Error('Course not found');
  if (course.universityId !== data.universityId) throw new Error('Course does not belong to the selected university');

  let agentId: string | null = null;
  let agentCommissionType: CommissionType | null = null;
  let agentCommissionValue: number | null = null;

  if (data.source === AdmissionSource.AGENT) {
    if (!data.agentId) throw new Error('Agent is required when source = AGENT');

    const agent = await prisma.user.findUnique({
      where: { id: data.agentId },
      select: { id: true, role: true, parentId: true, isActive: true }
    });
    if (!agent || agent.role !== Role.AGENT || !agent.isActive) throw new Error('Invalid agent');
    if (agent.parentId !== consultantId) throw new Error('Agent does not belong to this consultant');

    agentId = agent.id;

    const commission = await prisma.agentCommission.findUnique({
      where: { agentId_courseId: { agentId: agent.id, courseId: course.id } }
    });

    if (commission) {
      agentCommissionType = commission.type;
      agentCommissionValue = commission.value;
    }
  }

  const agentExpensesTotal = data.agentExpenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const consultancyExpensesTotal = data.consultancyExpenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);

  const fin = calculateAdmissionFinancials({
    amountReceived: data.amountReceived,
    universityFee: course.universityFee,
    agentCommission:
      agentId && agentCommissionType && agentCommissionValue !== null
        ? { type: agentCommissionType, value: agentCommissionValue }
        : { type: 'NONE' },
    agentExpensesTotal,
    consultancyExpensesTotal
  });

  const dob = data.dob ? new Date(data.dob) : null;
  const normalizedDob = dob && !Number.isNaN(dob.getTime()) ? dob : null;

  const admission = await prisma.$transaction(async (tx) => {
    const created = await tx.admission.create({
      data: {
        createdById: user.id,
        consultantId,
        agentId,
        status: AdmissionStatus.SUBMITTED,

        studentName: data.studentName,
        fatherName: data.fatherName || null,
        mobile: data.mobile,
        altMobile: data.altMobile || null,
        address: data.address || null,
        dob: normalizedDob,
        gender: data.gender || null,
        photoUrl: data.photoUrl || null,
        documents: data.documents ?? [],

        universityId: course.universityId,
        courseId: course.id,

        amountReceived: data.amountReceived,
        source: data.source,

        universityFee: course.universityFee,
        displayFee: course.displayFee,
        consultancyProfit: fin.consultancyProfit,

        agentCommissionType,
        agentCommissionValue,
        agentCommissionAmount: fin.agentCommissionAmount,

        agentExpensesTotal,
        consultancyExpensesTotal,
        netProfit: fin.netProfit
      }
    });

    // Expenses
    const expenseRows = [
      ...data.agentExpenses.map((e) => ({
        type: ExpenseType.AGENT,
        title: e.title,
        amount: e.amount,
        proofUrl: e.proofUrl || null,
        admissionId: created.id,
        createdById: user.id
      })),
      ...data.consultancyExpenses.map((e) => ({
        type: ExpenseType.CONSULTANCY,
        title: e.title,
        amount: e.amount,
        proofUrl: e.proofUrl || null,
        admissionId: created.id,
        createdById: user.id
      }))
    ];

    if (expenseRows.length > 0) {
      await tx.expense.createMany({ data: expenseRows });
    }

    // Ledgers
    await tx.universityLedger.create({
      data: {
        admissionId: created.id,
        universityId: created.universityId,
        amountPayable: created.universityFee,
        amountPaid: 0,
        status: PaymentStatus.PENDING
      }
    });

    if (created.agentId) {
      await tx.agentLedger.create({
        data: {
          admissionId: created.id,
          agentId: created.agentId,
          commissionAmount: created.agentCommissionAmount,
          amountPaid: 0,
          status: PaymentStatus.PENDING
        }
      });
    }

    await tx.profitLedger.create({
      data: {
        admissionId: created.id,
        grossProfit: created.consultancyProfit,
        agentCommission: created.agentCommissionAmount,
        agentExpenses: created.agentExpensesTotal,
        consultancyExpenses: created.consultancyExpensesTotal,
        netProfit: created.netProfit
      }
    });

    return created;
  });

  revalidatePath('/app/admissions');
  revalidatePath('/app');

  return { id: admission.id };
}
