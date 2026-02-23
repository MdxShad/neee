import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { createUniversityAction, deleteUniversityAction } from './actions';

export default async function UniversitiesPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const universities = await prisma.university.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Universities</h1>
        <p className="mt-1 text-sm text-zinc-600">Admin-only internal university management.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add University</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUniversityAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">University Name</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input id="contactPerson" name="contactPerson" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactNumber">Contact number</Label>
              <Input id="contactNumber" name="contactNumber" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" />
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
          <CardTitle>All Universities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Location</TH>
                  <TH>Contact</TH>
                  <TH>Email</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {universities.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <div className="font-medium">{u.name}</div>
                      {u.address ? <div className="text-xs text-zinc-500">{u.address}</div> : null}
                    </TD>
                    <TD>{u.location ?? '—'}</TD>
                    <TD>
                      <div>{u.contactPerson ?? '—'}</div>
                      <div className="text-xs text-zinc-500">{u.contactNumber ?? ''}</div>
                    </TD>
                    <TD>{u.email ?? '—'}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link className="text-sm underline" href={`/app/admin/universities/${u.id}`}>Edit</Link>
                        <form action={deleteUniversityAction.bind(null, u.id)}>
                          <button className="text-sm text-red-700 underline" type="submit">Delete</button>
                        </form>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {universities.length === 0 ? <div className="text-sm text-zinc-600">No universities yet.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
