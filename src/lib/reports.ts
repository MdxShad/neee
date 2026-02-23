import { Role, Prisma } from '@prisma/client';

export function parseDateRange(params: { from?: string; to?: string; period?: string }) {
  const now = new Date();
  const period = params.period || 'monthly';
  let from = new Date(now.getFullYear(), now.getMonth(), 1);
  let to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  if (period === 'daily') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'yearly') {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  if (params.from) {
    const d = new Date(params.from);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (params.to) {
    const d = new Date(params.to);
    if (!Number.isNaN(d.getTime())) to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  return { from, to, period };
}

export function admissionScopeWhere(user: { id: string; role: Role; parentId: string | null }): Prisma.AdmissionWhereInput {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (user.role === Role.CONSULTANT) return { consultantId: user.id };
  if (user.role === Role.STAFF) return { consultantId: user.parentId ?? '__NONE__' };
  return { agentId: user.id };
}

export function csv(rows: string[][]): string {
  return rows
    .map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
}
