import { requireUser } from '@/lib/auth';
import { Sidebar } from '@/components/shell/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>

      <div className="md:hidden border-b border-zinc-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">EduConnect CRM</div>
            <div className="text-xs text-zinc-500">{user.name} ({user.role})</div>
          </div>
          <a className="text-sm" href="/app/menu">Menu</a>
        </div>
      </div>

      <main className="p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
