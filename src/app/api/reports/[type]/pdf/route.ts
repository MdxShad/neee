import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function GET(req: Request, { params }: { params: { type: string } }) {
  const csvUrl = new URL(req.url);
  csvUrl.pathname = `/api/reports/${params.type}/csv`;
  const csvRes = await fetch(csvUrl.toString(), { headers: { cookie: (req.headers.get('cookie') ?? '') } });
  if (!csvRes.ok) return NextResponse.json({ error: 'Failed to render report' }, { status: csvRes.status });

  const text = await csvRes.text();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText(`${params.type.toUpperCase()} REPORT`, { x: 50, y: 800, size: 16, font: bold });
  let y = 780;
  for (const line of text.split('\n').slice(0, 45)) {
    page.drawText(line.slice(0, 105), { x: 50, y, size: 9, font });
    y -= 14;
    if (y < 50) break;
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${params.type}-report.pdf"` } });
}
