import { requireUser } from '@/lib/auth';
import { Sidebar } from '@/components/shell/sidebar';

export default async function MenuPage() {
  const user = await requireUser();
  return (
    <div className="h-[calc(100vh-56px)]">
      <Sidebar user={user} />
    </div>
  );
}
