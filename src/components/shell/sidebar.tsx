import Link from 'next/link';
import { AuthUser, signOutAction } from '@/lib/auth';
import { Role } from '@prisma/client';
import { canAccess } from '@/lib/roles';

type NavItem = { href: string; label: string; show: (u: AuthUser) => boolean };

const NAV: NavItem[] = [
  { href: '/app', label: 'Dashboard', show: () => true },

  // Admissions
  { href: '/app/admissions', label: 'Admissions', show: (u) => canAccess(u, 'ADMISSION_VIEW') || u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT || u.role === Role.AGENT },
  { href: '/app/admissions/new', label: 'New Admission', show: (u) => (u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT) || canAccess(u, 'ADMISSION_ADD') },

  // Agents
  { href: '/app/agents', label: 'Agents', show: (u) => u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT },

  // Ledgers
  { href: '/app/ledgers/university', label: 'University Ledger', show: (u) => u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT || canAccess(u, 'ACCOUNTS_VIEW') },
  { href: '/app/ledgers/agent', label: 'Agent Ledger', show: (u) => u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT || canAccess(u, 'ACCOUNTS_VIEW') },
  { href: '/app/ledgers/profit', label: 'Profit Ledger', show: (u) => u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT || canAccess(u, 'ACCOUNTS_VIEW') },

  // Expenses
  { href: '/app/expenses/daily', label: 'Daily Expenses', show: (u) => u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT || canAccess(u, 'EXPENSE_ADD') },

  // Reports
  { href: '/app/reports', label: 'Reports', show: (u) => u.role === Role.SUPER_ADMIN || u.role === Role.CONSULTANT || canAccess(u, 'REPORTS_VIEW') },

  // Admin-only
  { href: '/app/admin/universities', label: 'Universities', show: (u) => u.role === Role.SUPER_ADMIN },
  { href: '/app/admin/courses', label: 'Courses', show: (u) => u.role === Role.SUPER_ADMIN },
  { href: '/app/admin/users', label: 'Users & Staff', show: (u) => u.role === Role.SUPER_ADMIN }
];

export function Sidebar({ user }: { user: AuthUser }) {
  return (
    <aside className="flex h-full w-full flex-col gap-4 border-r border-zinc-200 bg-white p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">EduConnect CRM</div>
        <div className="text-xs text-zinc-500">
          Signed in as <span className="font-medium text-zinc-800">{user.name}</span> ({user.role})
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.filter((n) => n.show(user)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto">
        <form action={signOutAction}>
          <button className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
