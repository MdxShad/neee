import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PosterCard } from './poster-card';

export default async function PostersPage({ searchParams }: { searchParams?: { courseTag?: string; universityTag?: string } }) {
  const user = await requireUser();
  if (user.role !== Role.CONSULTANT && user.role !== Role.AGENT) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">Not allowed.</div>;
  }

  const settings = await prisma.consultancySettings.findUnique({ where: { id: 'default' } });
  const self = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, mobile: true, parent: { select: { name: true, mobile: true } } } });

  const where: any = { isActive: true };
  if (searchParams?.courseTag) where.courseTag = { contains: searchParams.courseTag, mode: 'insensitive' };
  if (searchParams?.universityTag) where.universityTag = { contains: searchParams.universityTag, mode: 'insensitive' };

  const posters = await prisma.poster.findMany({ where, orderBy: { createdAt: 'desc' } });

  const personName = user.role === Role.AGENT ? self?.name ?? user.name : self?.name ?? user.name;
  const mobile = (user.role === Role.AGENT ? self?.mobile : self?.mobile) ?? '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketing Posters</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Filter</CardTitle></CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 md:grid-cols-3">
            <Input name="courseTag" placeholder="Course tag" defaultValue={searchParams?.courseTag ?? ''} />
            <Input name="universityTag" placeholder="University tag" defaultValue={searchParams?.universityTag ?? ''} />
            <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm">Apply</button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {posters.map((p) => (
          <PosterCard key={p.id} poster={p} consultancyName={settings?.consultancyName || 'EduConnect Consultancy'} personName={personName} mobile={mobile} />
        ))}
      </div>
    </div>
  );
}
