import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { formatINR } from '@/lib/money';

function canView(user: { id: string; role: Role; parentId: string | null }, consultantId: string) {
  if (user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.CONSULTANT) return user.id === consultantId;
  if (user.role === Role.STAFF) return user.parentId === consultantId;
  return false;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      universityLedger: { include: { university: true, admission: { include: { consultant: true, course: true } } } },
      agentLedger: { include: { agent: true, admission: { include: { consultant: true, course: true } } } },
      createdBy: true
    }
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admission = payment.universityLedger?.admission ?? payment.agentLedger?.admission;
  if (!admission || !canView(user, admission.consultantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await prisma.consultancySettings.findUnique({ where: { id: 'default' } });
  const consultancyName = settings?.consultancyName ?? 'EduConnect Consultancy';
  const consultancyPhone = settings?.phone ?? '';
  const consultancyEmail = settings?.email ?? '';
  const consultancyAddress = settings?.address ?? '';

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const owner = payment.universityLedger ? payment.universityLedger.university.name : payment.agentLedger?.agent.name;
  const payable = payment.universityLedger ? payment.universityLedger.amountPayable : (payment.agentLedger?.commissionAmount ?? 0);
  const paid = payment.universityLedger ? payment.universityLedger.amountPaid : (payment.agentLedger?.amountPaid ?? 0);
  const pending = Math.max(0, payable - paid);

  let y = 790;
  page.drawText(`${consultancyName} — Payment Slip`, { x: 50, y, size: 18, font: bold }); y -= 20;
  page.drawText(`${consultancyPhone}${consultancyEmail ? ` | ${consultancyEmail}` : ''}`, { x: 50, y, size: 10, font }); y -= 16;
  if (consultancyAddress) { page.drawText(consultancyAddress.slice(0, 90), { x: 50, y, size: 10, font }); y -= 14; }
  y -= 4;
  page.drawText(`Payment ID: ${payment.id}`, { x: 50, y, size: 10, font }); y -= 20;
  page.drawText(`Type: ${payment.type}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Owner: ${owner ?? '—'}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Admission: ${admission.studentName} (${admission.course.name})`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Amount paid: ${formatINR(payment.amount)}`, { x: 50, y, size: 11, font: bold }); y -= 18;
  page.drawText(`Date: ${new Date(payment.paidAt).toLocaleDateString()}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Method: ${payment.method}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Reference: ${payment.reference ?? '—'}`, { x: 50, y, size: 11, font }); y -= 18;
  page.drawText(`Notes: ${payment.notes ?? '—'}`, { x: 50, y, size: 11, font }); y -= 24;

  page.drawText(`Ledger totals after payment`, { x: 50, y, size: 12, font: bold, color: rgb(0.1,0.1,0.1) }); y -= 18;
  page.drawText(`Payable: ${formatINR(payable)} | Paid: ${formatINR(paid)} | Pending: ${formatINR(pending)}`, { x: 50, y, size: 11, font });

  page.drawLine({ start: { x: 50, y: 120 }, end: { x: 220, y: 120 }, thickness: 1, color: rgb(0.5,0.5,0.5)});
  page.drawLine({ start: { x: 340, y: 120 }, end: { x: 520, y: 120 }, thickness: 1, color: rgb(0.5,0.5,0.5)});
  page.drawText('Authorized Signature', { x: 70, y: 105, size: 10, font });
  page.drawText('Receiver Signature', { x: 375, y: 105, size: 10, font });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="payment-${payment.id}.pdf"` } });
}
