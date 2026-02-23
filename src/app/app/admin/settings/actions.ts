'use server';

import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consultancySettingsSchema } from '@/lib/validation';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const SETTINGS_ID = 'default';

export async function upsertConsultancySettingsAction(formData: FormData): Promise<void> {
  await requireRole([Role.SUPER_ADMIN]);

  const raw = {
    consultancyName: String(formData.get('consultancyName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
    address: String(formData.get('address') ?? ''),
    terms: String(formData.get('terms') ?? '')
  };

  const parsed = consultancySettingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid settings data.');
  }

  await prisma.consultancySettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      consultancyName: parsed.data.consultancyName.trim(),
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.trim() || null,
      address: parsed.data.address?.trim() || null,
      terms: parsed.data.terms?.trim() || null
    },
    create: {
      id: SETTINGS_ID,
      consultancyName: parsed.data.consultancyName.trim(),
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.trim() || null,
      address: parsed.data.address?.trim() || null,
      terms: parsed.data.terms?.trim() || null
    }
  });

  revalidatePath('/app/admin/settings');
}
