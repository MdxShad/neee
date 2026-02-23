import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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

function safeText(v: string | null | undefined): string {
  return v && v.trim().length > 0 ? v : '—';
}

function drawRow(page: any, x: number, y: number, left: string, right: string, font: any) {
  page.drawText(left, { x, y, size: 10, font, color: rgb(0, 0, 0) });
  page.drawText(right, { x: 400, y, size: 10, font, color: rgb(0, 0, 0) });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admission = await prisma.admission.findUnique({
    where: { id: params.id },
    include: {
      university: true,
      course: true,
      agent: true,
      consultant: true
    }
  });

  if (!admission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!canView(user, admission)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await prisma.consultancySettings.findUnique({ where: { id: 'default' } });
  const consultancyName = settings?.consultancyName?.trim() || 'EduConnect Consultancy';
  const consultancyPhone = settings?.phone?.trim() || '';

  const terms = settings?.terms?.trim()
    ? settings.terms
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [
        '• (Add your consultancy terms & conditions here)',
        '• (Example: Fee receipts and payment schedules can be attached separately)',
        '• (Example: University fee is payable as per university rules)'
      ];

  const pendingFee = Math.max(0, admission.displayFee - admission.amountReceived);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const copies: Array<{ label: string }> = [
    { label: 'Consultancy Copy' },
    { label: 'University Copy' },
    { label: 'Student Copy' }
  ];

  for (const copy of copies) {
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // Header
    page.drawText(`${consultancyName} — Admission Slip`, { x: 50, y: height - 60, size: 18, font: fontBold });
    page.drawText(copy.label, { x: width - 200, y: height - 55, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

    page.drawLine({ start: { x: 50, y: height - 70 }, end: { x: width - 50, y: height - 70 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

    // Student section
    page.drawText('Student Details', { x: 50, y: height - 100, size: 12, font: fontBold });
    drawRow(page, 50, height - 120, 'Student Name:', safeText(admission.studentName), font);
    drawRow(page, 50, height - 136, 'Father Name:', safeText(admission.fatherName), font);
    drawRow(page, 50, height - 152, 'Mobile:', safeText(admission.mobile), font);
    drawRow(page, 50, height - 168, 'Alt Mobile:', safeText(admission.altMobile), font);
    drawRow(page, 50, height - 184, 'Address:', safeText(admission.address), font);

    // Course section
    page.drawText('Course Details', { x: 50, y: height - 220, size: 12, font: fontBold });
    drawRow(page, 50, height - 240, 'University:', safeText(admission.university.name), font);
    drawRow(page, 50, height - 256, 'Course:', safeText(admission.course.name), font);

    // Fees
    page.drawText('Fee Structure', { x: 50, y: height - 292, size: 12, font: fontBold });
    drawRow(page, 50, height - 312, 'University Fee (Payable):', formatINR(admission.universityFee), font);
    drawRow(page, 50, height - 328, 'Student Display Fee:', formatINR(admission.displayFee), font);
    drawRow(page, 50, height - 344, 'Paid Fee (Received):', formatINR(admission.amountReceived), font);
    drawRow(page, 50, height - 360, 'Pending Fee:', formatINR(pendingFee), font);

    page.drawLine({ start: { x: 50, y: height - 372 }, end: { x: width - 50, y: height - 372 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

    // Profit summary
    page.drawText('Profit Summary', { x: 50, y: height - 400, size: 12, font: fontBold });
    drawRow(page, 50, height - 420, 'Consultancy Profit:', formatINR(admission.consultancyProfit), font);
    drawRow(page, 50, height - 436, 'Agent Commission:', formatINR(admission.agentCommissionAmount), font);
    drawRow(page, 50, height - 452, 'Agent Expenses:', formatINR(admission.agentExpensesTotal), font);
    drawRow(page, 50, height - 468, 'Consultancy Expenses:', formatINR(admission.consultancyExpensesTotal), font);

    page.drawLine({ start: { x: 50, y: height - 480 }, end: { x: width - 50, y: height - 480 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

    page.drawText('Final Net Profit:', { x: 50, y: height - 505, size: 12, font: fontBold });
    page.drawText(formatINR(admission.netProfit), { x: 400, y: height - 505, size: 12, font: fontBold });

    // Source
    page.drawText('Admission Source', { x: 50, y: height - 540, size: 12, font: fontBold });
    drawRow(page, 50, height - 560, 'Source:', admission.source === 'DIRECT' ? 'Direct Consultancy' : 'Agent', font);
    drawRow(page, 50, height - 576, 'Agent:', admission.agent ? `${admission.agent.name} (${admission.agent.userId})` : '—', font);

    // Terms
    page.drawText('Terms & Conditions', { x: 50, y: height - 612, size: 12, font: fontBold });
    let ty = height - 632;
    for (const t of terms) {
      page.drawText(t.startsWith('•') ? t : `• ${t}`, { x: 55, y: ty, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
      ty -= 14;
    }

    // Footer
    page.drawLine({ start: { x: 50, y: 80 }, end: { x: width - 50, y: 80 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
    page.drawText(`Generated for: ${admission.consultant.name}`, { x: 50, y: 60, size: 10, font });
    page.drawText(`Consultancy: ${consultancyName}${consultancyPhone ? ` | ${consultancyPhone}` : ''}`, { x: 50, y: 45, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`Admission ID: ${admission.id}`, { x: 50, y: 30, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  }

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="admission-${admission.id}.pdf"`,
      'Cache-Control': 'no-store'
    }
  });
}
