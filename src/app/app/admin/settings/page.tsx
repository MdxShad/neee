import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { upsertConsultancySettingsAction } from './actions';

const SETTINGS_ID = 'default';

export default async function ConsultancySettingsPage() {
  await requireRole([Role.SUPER_ADMIN]);

  const settings = await prisma.consultancySettings.findUnique({
    where: { id: SETTINGS_ID }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Consultancy Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">These settings are used in admission PDFs and branding content.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertConsultancySettingsAction} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="consultancyName">Consultancy Name</Label>
              <Input
                id="consultancyName"
                name="consultancyName"
                required
                defaultValue={settings?.consultancyName ?? 'EduConnect Consultancy'}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={settings?.phone ?? ''} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={settings?.email ?? ''} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" rows={3} defaultValue={settings?.address ?? ''} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea id="terms" name="terms" rows={6} defaultValue={settings?.terms ?? ''} />
            </div>

            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
