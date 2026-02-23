import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { createCourseAction, deleteCourseAction } from './actions';
import { formatINR } from '@/lib/money';

export default async function CoursesPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const [universities, courses] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: 'asc' } }),
    prisma.course.findMany({ include: { university: true }, orderBy: { createdAt: 'desc' } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="mt-1 text-sm text-zinc-600">Admin-only course setup (fees, duration, session).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Course</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCourseAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="universityId">University</Label>
              <Select id="universityId" name="universityId" required defaultValue="">
                <option value="" disabled>Select university</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">Course name</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="duration">Duration</Label>
              <Input id="duration" name="duration" placeholder="e.g. 3 Years" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Course type</Label>
              <Input id="type" name="type" placeholder="e.g. UG/PG/Diploma" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="universityFee">University fee (actual payable)</Label>
              <Input id="universityFee" name="universityFee" type="number" min={0} step={1} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="displayFee">Student display fee</Label>
              <Input id="displayFee" name="displayFee" type="number" min={0} step={1} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="session">Admission session</Label>
              <Input id="session" name="session" placeholder="e.g. 2025-26" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Course</TH>
                  <TH>University</TH>
                  <TH>Fees</TH>
                  <TH>Session</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {courses.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500">{[c.type, c.duration].filter(Boolean).join(' • ') || '—'}</div>
                    </TD>
                    <TD>{c.university.name}</TD>
                    <TD>
                      <div>University: {formatINR(c.universityFee)}</div>
                      <div className="text-xs text-zinc-500">Display: {formatINR(c.displayFee)}</div>
                    </TD>
                    <TD>{c.session ?? '—'}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link className="text-sm underline" href={`/app/admin/courses/${c.id}`}>Edit</Link>
                        <form action={deleteCourseAction.bind(null, c.id)}>
                          <button className="text-sm text-red-700 underline" type="submit">Delete</button>
                        </form>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          {courses.length === 0 ? <div className="text-sm text-zinc-600">No courses yet.</div> : null}
        </CardContent>
      </Card>

      {universities.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add at least 1 university before adding courses.
        </div>
      ) : null}
    </div>
  );
}
