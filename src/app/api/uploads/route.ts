import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const MAX_BYTES = 5 * 1024 * 1024;

function extFor(type: string): string {
  if (type === 'image/jpeg') return '.jpg';
  if (type === 'image/png') return '.png';
  return '.pdf';
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (![Role.SUPER_ADMIN, Role.STAFF, Role.CONSULTANT, Role.AGENT].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, PDF allowed' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN is missing' }, { status: 500 });
  }

  const pathPrefix = String(form.get('pathPrefix') ?? 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '');
  const baseName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.+/g, '.');
  const pathname = `${pathPrefix}/${Date.now()}-${crypto.randomUUID()}-${baseName || `file${extFor(file.type)}`}`;

  const uploadRes = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type,
      'x-content-type': file.type,
      'x-add-random-suffix': '0',
      'x-allow-overwrite': '0',
      'x-cache-control-max-age': '31536000'
    },
    body: file
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    return NextResponse.json({ error: `Upload failed: ${text}` }, { status: 500 });
  }

  const data = await uploadRes.json();
  return NextResponse.json({
    url: data.url as string,
    pathname: data.pathname as string,
    contentType: file.type,
    size: file.size,
    name: file.name
  });
}
