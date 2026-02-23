'use server';

import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { courseSchema } from '@/lib/validation';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createCourseAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const raw = {
    universityId: String(formData.get('universityId') ?? ''),
    name: String(formData.get('name') ?? ''),
    duration: String(formData.get('duration') ?? ''),
    type: String(formData.get('type') ?? ''),
    universityFee: formData.get('universityFee') ?? 0,
    displayFee: formData.get('displayFee') ?? 0,
    session: String(formData.get('session') ?? ''),
    notes: String(formData.get('notes') ?? '')
  };

  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid course data');

  await prisma.course.create({
    data: {
      universityId: parsed.data.universityId,
      name: parsed.data.name,
      duration: parsed.data.duration || null,
      type: parsed.data.type || null,
      universityFee: parsed.data.universityFee,
      displayFee: parsed.data.displayFee,
      session: parsed.data.session || null,
      notes: parsed.data.notes || null
    }
  });

  revalidatePath('/app/admin/courses');
}

export async function deleteCourseAction(id: string) {
  await requireRole([Role.SUPER_ADMIN]);
  await prisma.course.delete({ where: { id } });
  revalidatePath('/app/admin/courses');
}

export async function updateCourseAction(id: string, formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);

  const raw = {
    universityId: String(formData.get('universityId') ?? ''),
    name: String(formData.get('name') ?? ''),
    duration: String(formData.get('duration') ?? ''),
    type: String(formData.get('type') ?? ''),
    universityFee: formData.get('universityFee') ?? 0,
    displayFee: formData.get('displayFee') ?? 0,
    session: String(formData.get('session') ?? ''),
    notes: String(formData.get('notes') ?? '')
  };

  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Invalid course data');

  await prisma.course.update({
    where: { id },
    data: {
      universityId: parsed.data.universityId,
      name: parsed.data.name,
      duration: parsed.data.duration || null,
      type: parsed.data.type || null,
      universityFee: parsed.data.universityFee,
      displayFee: parsed.data.displayFee,
      session: parsed.data.session || null,
      notes: parsed.data.notes || null
    }
  });

  revalidatePath('/app/admin/courses');
  revalidatePath(`/app/admin/courses/${id}`);
}
