import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileUploader } from '@/components/ui/file-uploader';
import { createPosterAction, deletePosterAction, togglePosterAction } from './actions';

export default async function PostersAdminPage() {
  await requireRole([Role.SUPER_ADMIN]);
  const posters = await prisma.poster.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketing Posters</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload Poster</CardTitle></CardHeader>
        <CardContent>
          <form action={createPosterAction} className="space-y-4">
            <div className="space-y-1">
              <Label>Poster image</Label>
              <FileUploader inputName="imageUrl" pathPrefix="posters" accept=".jpg,.jpeg,.png" label="Upload poster" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1"><Label>Course tag (optional)</Label><Input name="courseTag" /></div>
              <div className="space-y-1"><Label>University tag (optional)</Label><Input name="universityTag" /></div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm"><Checkbox name="isActive" defaultChecked /> Active</label>
            <div><Button type="submit">Save Poster</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Posters</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <THead><TR><TH>Preview</TH><TH>Tags</TH><TH>Status</TH><TH className="text-right">Actions</TH></TR></THead>
              <TBody>
                {posters.map((p) => (
                  <TR key={p.id}>
                    <TD><img src={p.imageUrl} alt="Poster" className="h-20 w-auto rounded border" /></TD>
                    <TD><div className="text-sm">{p.courseTag || '—'} / {p.universityTag || '—'}</div></TD>
                    <TD>{p.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <form action={togglePosterAction.bind(null, p.id)}><button className="text-sm underline" type="submit">{p.isActive ? 'Disable' : 'Enable'}</button></form>
                        <form action={deletePosterAction.bind(null, p.id)}><button className="text-sm underline text-red-700" type="submit">Delete</button></form>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
