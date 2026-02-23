import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { updateUniversityAction } from '../actions';

export default async function UniversityEditPage({ params }: { params: { id: string } }) {
  await requireRole([Role.SUPER_ADMIN]);
  const uni = await prisma.university.findUnique({ where: { id: params.id } });
  if (!uni) return notFound();

  async function action(formData: FormData) {
    'use server';
    await updateUniversityAction(params.id, formData);
    redirect('/app/admin/universities');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Edit University</h1>
          <p className="mt-1 text-sm text-zinc-600">Update internal university details.</p>
        </div>
        <Link href="/app/admin/universities" className="text-sm underline">Back</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{uni.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="name">University Name</Label>
              <Input id="name" name="name" defaultValue={uni.name} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={uni.location ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input id="contactPerson" name="contactPerson" defaultValue={uni.contactPerson ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactNumber">Contact number</Label>
              <Input id="contactNumber" name="contactNumber" defaultValue={uni.contactNumber ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={uni.email ?? ''} />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" defaultValue={uni.address ?? ''} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={uni.notes ?? ''} />
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
