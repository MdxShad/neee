'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './db';
import { loginSchema } from './validation';
import { Role } from '@prisma/client';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'educonnect_session';
const TTL_DAYS = Number.parseInt(process.env.SESSION_TTL_DAYS || '14', 10);

export type AuthUser = {
  id: string;
  userId: string;
  name: string;
  role: Role;
  parentId: string | null;
  permissions: unknown | null;
};

function ttlMs(): number {
  const days = Number.isFinite(TTL_DAYS) && TTL_DAYS > 0 ? TTL_DAYS : 14;
  return days * 24 * 60 * 60 * 1000;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          userId: true,
          name: true,
          role: true,
          parentId: true,
          permissions: true,
          isActive: true
        }
      }
    }
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Clean up expired session
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    userId: session.user.userId,
    name: session.user.name,
    role: session.user.role,
    parentId: session.user.parentId,
    permissions: session.user.permissions
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(roles: Role[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/app');
  return user;
}

async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMs());

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });

  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt
  });
}

export async function signInAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const raw = {
    userId: String(formData.get('userId') ?? ''),
    password: String(formData.get('password') ?? '')
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid credentials format.' };
  }

  const user = await prisma.user.findUnique({
    where: { userId: parsed.data.userId },
    select: { id: true, passwordHash: true, isActive: true }
  });

  if (!user || !user.isActive) {
    return { ok: false, error: 'Invalid credentials.' };
  }

  const match = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!match) {
    return { ok: false, error: 'Invalid credentials.' };
  }

  await createSession(user.id);
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
  }

  cookies().set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0)
  });

  redirect('/login');
}
