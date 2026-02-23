import Link from 'next/link';
import { requireUser } from '@/lib/auth';

const routes = [
  ['admissions','Admission report'],
  ['agents','Agent-wise report'],
  ['universities','University-wise report'],
  ['profit','Profit report'],
  ['expenses','Expense report'],
  ['net-income','Net income report']
] as const;

export default async function ReportsHome() {
  await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <div className="grid gap-2 md:grid-cols-2">
        {routes.map(([slug,label]) => (
          <Link key={slug} href={`/app/reports/${slug}`} className="rounded border border-zinc-200 p-3 text-sm hover:bg-zinc-50">{label}</Link>
        ))}
      </div>
    </div>
  );
}
