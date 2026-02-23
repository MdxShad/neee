import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { formatINR } from '@/lib/money';

function canView(user: { id: string; role: Role; parentId: string | null }, admission: { consultantId: string; agentId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) return admission.consultantId === user.id;
  if (user.role === Role.STAFF) return admission.consultantId === (user.parentId ?? '__NONE__');
  return admission.agentId === user.id;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admission = await prisma.admission.findUnique({
    where: { id: params.id },
    include: { consultant: true, course: true, studentPayments: true }
  });
  if (!admission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canView(user, admission)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await prisma.consultancySettings.findUnique({ where: { id: 'default' } });
  const totalReceived = admission.studentPayments.length > 0 ? admission.studentPayments.reduce((s, p) => s + p.amount, 0) : admission.amountReceived;
  const pending = Math.max(0, admission.displayFee - totalReceived);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  page.drawText(`${settings?.consultancyName ?? 'EduConnect Consultancy'} — Fee Receipt`, { x: 50, y, size: 18, font: bold }); y -= 20;
  page.drawText(`${settings?.phone ?? ''}${settings?.email ? ` | ${settings.email}` : ''}`, { x: 50, y, size: 10, font }); y -= 18;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y, size: 11, font }); y -= 20;
  page.drawText(`Student: ${admission.studentName}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Course: ${admission.course.name}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Amount paid: ${formatINR(totalReceived)}`, { x: 50, y, size: 11, font: bold }); y -= 18;
  page.drawText(`Pending fee: ${formatINR(pending)}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Consultant: ${admission.consultant.name}`, { x: 50, y, size: 11, font });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="receipt-${admission.id}.pdf"` } });
}
