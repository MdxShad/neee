import { Role } from '@prisma/client';

export type StaffPermission =
  | 'ADMISSION_VIEW'
  | 'ADMISSION_ADD'
  | 'ADMISSION_EDIT'
  | 'ACCOUNTS_VIEW'
  | 'EXPENSE_ADD'
  | 'REPORTS_VIEW'
  | 'USER_MANAGE';

export const ALL_STAFF_PERMISSIONS: { key: StaffPermission; label: string; description: string }[] = [
  {
    key: 'ADMISSION_VIEW',
    label: 'Admission view',
    description: 'Can view admissions list and details.'
  },
  {
    key: 'ADMISSION_ADD',
    label: 'Add admission',
    description: 'Can create new admissions.'
  },
  {
    key: 'ADMISSION_EDIT',
    label: 'Edit admission',
    description: 'Can edit admissions (if enabled in future milestones).'
  },
  {
    key: 'ACCOUNTS_VIEW',
    label: 'Accounts view',
    description: 'Can view ledgers and financial pages.'
  },
  {
    key: 'EXPENSE_ADD',
    label: 'Expense add',
    description: 'Can add daily expenses.'
  },
  {
    key: 'REPORTS_VIEW',
    label: 'Reports',
    description: 'Can view reports.'
  },
  {
    key: 'USER_MANAGE',
    label: 'User management',
    description: 'Can manage users (staff/agents) if allowed.'
  }
];

export function isAdminRole(role: Role): boolean {
  return role === Role.SUPER_ADMIN;
}

export function isConsultantRole(role: Role): boolean {
  return role === Role.CONSULTANT;
}

export function isAgentRole(role: Role): boolean {
  return role === Role.AGENT;
}

export function isStaffRole(role: Role): boolean {
  return role === Role.STAFF;
}

export function hasStaffPermission(user: { role: Role; permissions: unknown | null }, perm: StaffPermission): boolean {
  if (user.role !== Role.STAFF) return false;
  if (!user.permissions) return false;
  if (!Array.isArray(user.permissions)) return false;
  return (user.permissions as unknown[]).includes(perm);
}

export function canAccess(user: { role: Role; permissions: unknown | null }, perm: StaffPermission): boolean {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) {
    // Consultant has broad access to their own operations.
    // Keep this conservative; routes still enforce scope.
    return true;
  }
  if (user.role === Role.AGENT) {
    // Agent is view-only per spec.
    return perm === 'ADMISSION_VIEW' || perm === 'REPORTS_VIEW';
  }
  return hasStaffPermission(user, perm);
}
