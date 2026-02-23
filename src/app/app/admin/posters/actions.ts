'use server';

import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { posterSchema } from '@/lib/validation';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createPosterAction(formData: FormData) {
  await requireRole([Role.SUPER_ADMIN]);
  const parsed = posterSchema.safeParse({
    imageUrl: String(formData.get('imageUrl') ?? ''),
    courseTag: String(formData.get('courseTag') ?? ''),
    universityTag: String(formData.get('universityTag') ?? ''),
    isActive: formData.get('isActive') ?? 'true'
  });
  if (!parsed.success) throw new Error('Invalid poster data');

  await prisma.poster.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      courseTag: parsed.data.courseTag || null,
      universityTag: parsed.data.universityTag || null,
      isActive: parsed.data.isActive
    }
  });

  revalidatePath('/app/admin/posters');
  revalidatePath('/app/posters');
}

export async function togglePosterAction(id: string) {
  await requireRole([Role.SUPER_ADMIN]);
  const p = await prisma.poster.findUnique({ where: { id }, select: { isActive: true } });
  if (!p) return;
  await prisma.poster.update({ where: { id }, data: { isActive: !p.isActive } });
  revalidatePath('/app/admin/posters');
  revalidatePath('/app/posters');
}

export async function deletePosterAction(id: string) {
  await requireRole([Role.SUPER_ADMIN]);
  await prisma.poster.delete({ where: { id } }).catch(() => undefined);
  revalidatePath('/app/admin/posters');
  revalidatePath('/app/posters');
}
