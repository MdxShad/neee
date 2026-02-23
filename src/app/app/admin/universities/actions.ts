'use server';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { universitySchema } from '@/lib/validation';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createUniversityAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const raw = {
    name: String(formData.get('name') ?? ''),
    location: String(formData.get('location') ?? ''),
    contactPerson: String(formData.get('contactPerson') ?? ''),
    contactNumber: String(formData.get('contactNumber') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    notes: String(formData.get('notes') ?? '')
  };

  const parsed = universitySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid university data');
  }

  await prisma.university.create({
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      contactPerson: parsed.data.contactPerson || null,
      contactNumber: parsed.data.contactNumber || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null
    }
  });

  revalidatePath('/app/admin/universities');
}

export async function deleteUniversityAction(id: string) {
  await requireRole([Role.SUPER_ADMIN]);
  await prisma.university.delete({ where: { id } });
  revalidatePath('/app/admin/universities');
  revalidatePath('/app/admin/courses');
}

export async function updateUniversityAction(id: string, formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const raw = {
    name: String(formData.get('name') ?? ''),
    location: String(formData.get('location') ?? ''),
    contactPerson: String(formData.get('contactPerson') ?? ''),
    contactNumber: String(formData.get('contactNumber') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    notes: String(formData.get('notes') ?? '')
  };

  const parsed = universitySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid university data');
  }

  await prisma.university.update({
    where: { id },
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      contactPerson: parsed.data.contactPerson || null,
      contactNumber: parsed.data.contactNumber || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null
    }
  });

  revalidatePath('/app/admin/universities');
  revalidatePath(`/app/admin/universities/${id}`);
}
