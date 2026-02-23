import { z } from 'zod';
import { CommissionType, AdmissionSource } from '@prisma/client';

export const loginSchema = z.object({
  userId: z.string().min(2).max(50),
  password: z.string().min(4).max(100)
});

export const universitySchema = z.object({
  name: z.string().min(2).max(200),
  location: z.string().max(200).optional().or(z.literal('')),
  contactPerson: z.string().max(200).optional().or(z.literal('')),
  contactNumber: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal(''))
});

export const courseSchema = z.object({
  universityId: z.string().min(1),
  name: z.string().min(2).max(200),
  duration: z.string().max(100).optional().or(z.literal('')),
  type: z.string().max(100).optional().or(z.literal('')),
  universityFee: z.coerce.number().int().nonnegative(),
  displayFee: z.coerce.number().int().nonnegative(),
  session: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal(''))
});

export const createAgentSchema = z.object({
  userId: z.string().min(2).max(50),
  password: z.string().min(4).max(100),
  name: z.string().min(2).max(200),
  mobile: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  idProofUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.coerce.boolean().optional()
});

export const agentCommissionSchema = z.object({
  agentId: z.string().min(1),
  courseId: z.string().min(1),
  type: z.nativeEnum(CommissionType),
  value: z.coerce.number().int().nonnegative()
});

export const createStaffSchema = z.object({
  userId: z.string().min(2).max(50),
  password: z.string().min(4).max(100),
  name: z.string().min(2).max(200),
  parentConsultantId: z.string().optional().or(z.literal('')),
  permissions: z.array(z.string()).default([])
});

export const admissionExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.coerce.number().int().nonnegative(),
  proofUrl: z.string().url().optional().or(z.literal(''))
});

export const createAdmissionSchema = z.object({
  consultantId: z.string().optional().or(z.literal("")),

  // Step 1
  studentName: z.string().min(2).max(200),
  fatherName: z.string().max(200).optional().or(z.literal('')),
  mobile: z.string().min(5).max(50),
  altMobile: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  gender: z.string().max(50).optional().or(z.literal('')),
  photoUrl: z.string().url().optional().or(z.literal('')),
  documents: z.array(z.object({
    name: z.string().min(1).max(255),
    url: z.string().url(),
    type: z.string().min(1).max(100)
  })).optional().default([]),

  // Step 2
  universityId: z.string().min(1),
  courseId: z.string().min(1),

  // Step 3
  amountReceived: z.coerce.number().int().nonnegative(),

  // Step 4
  source: z.nativeEnum(AdmissionSource),
  agentId: z.string().optional().or(z.literal('')),

  // Step 5
  agentExpenses: z.array(admissionExpenseSchema).default([]),
  consultancyExpenses: z.array(admissionExpenseSchema).default([])
});


export const consultancySettingsSchema = z.object({
  consultancyName: z.string().min(2).max(200),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  terms: z.string().max(5000).optional().or(z.literal(''))
});

export const posterSchema = z.object({
  imageUrl: z.string().url(),
  courseTag: z.string().max(100).optional().or(z.literal('')),
  universityTag: z.string().max(100).optional().or(z.literal('')),
  isActive: z.coerce.boolean().optional().default(true)
});

export const ledgerPaymentSchema = z.object({
  amount: z.coerce.number().int().positive(),
  paidAt: z.string().min(1),
  method: z.string().min(2).max(100),
  reference: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  proofUrl: z.string().url()
});

export const studentPaymentSchema = z.object({
  amount: z.coerce.number().int().positive(),
  paidAt: z.string().min(1),
  note: z.string().max(500).optional().or(z.literal('')),
  proofUrl: z.string().url().optional().or(z.literal(''))
});
