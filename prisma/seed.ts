import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function envOr(name: string, fallback: string): string {
  const v = process.env[name];
  return (v && v.trim().length > 0) ? v.trim() : fallback;
}

async function upsertUser(args: {
  userId: string;
  name: string;
  role: Role;
  password: string;
  parentId?: string | null;
  email?: string | null;
  mobile?: string | null;
}): Promise<void> {
  const passwordHash = await bcrypt.hash(args.password, 12);
  await prisma.user.upsert({
    where: { userId: args.userId },
    update: {
      name: args.name,
      role: args.role,
      parentId: args.parentId ?? null,
      email: args.email ?? null,
      mobile: args.mobile ?? null,
      passwordHash,
      isActive: true
    },
    create: {
      userId: args.userId,
      name: args.name,
      role: args.role,
      parentId: args.parentId ?? null,
      email: args.email ?? null,
      mobile: args.mobile ?? null,
      passwordHash,
      isActive: true
    }
  });
}

async function main() {
  const superUserId = envOr('SEED_SUPERADMIN_USERID', 'admin');
  const superPass = envOr('SEED_SUPERADMIN_PASSWORD', 'admin123');
  const superName = envOr('SEED_SUPERADMIN_NAME', 'Super Admin');

  await upsertUser({
    userId: superUserId,
    password: superPass,
    name: superName,
    role: Role.SUPER_ADMIN
  });

  const consultantUserId = process.env.SEED_CONSULTANT_USERID?.trim();
  const consultantPass = process.env.SEED_CONSULTANT_PASSWORD?.trim();
  const consultantName = (process.env.SEED_CONSULTANT_NAME?.trim() || 'Consultant');

  if (consultantUserId && consultantPass) {
    await upsertUser({
      userId: consultantUserId,
      password: consultantPass,
      name: consultantName,
      role: Role.CONSULTANT
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
