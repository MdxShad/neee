import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { updateCourseAction } from '../actions';

export default async function CourseEditPage({ params }: { params: { id: string } }) {
  await requireRole([Role.SUPER_ADMIN]);

  const [course, universities] = await Promise.all([
    prisma.course.findUnique({ where: { id: params.id }, include: { university: true } }),
    prisma.university.findMany({ orderBy: { name: 'asc' } })
  ]);

  if (!course) return notFound();

  async function action(formData: FormData) {
    'use server';
    await updateCourseAction(params.id, formData);
    redirect('/app/admin/courses');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit Course</h1>
          <p className="mt-1 text-sm text-zinc-600">Update course fees and details.</p>
        </div>
        <Link href="/app/admin/courses" className="text-sm underline">Back</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{course.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="universityId">University</Label>
              <Select id="universityId" name="universityId" required defaultValue={course.universityId}>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">Course name</Label>
              <Input id="name" name="name" defaultValue={course.name} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="duration">Duration</Label>
              <Input id="duration" name="duration" defaultValue={course.duration ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Course type</Label>
              <Input id="type" name="type" defaultValue={course.type ?? ''} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="universityFee">University fee (actual payable)</Label>
              <Input id="universityFee" name="universityFee" type="number" min={0} step={1} defaultValue={course.universityFee} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="displayFee">Student display fee</Label>
              <Input id="displayFee" name="displayFee" type="number" min={0} step={1} defaultValue={course.displayFee} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="session">Admission session</Label>
              <Input id="session" name="session" defaultValue={course.session ?? ''} />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={course.notes ?? ''} />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
