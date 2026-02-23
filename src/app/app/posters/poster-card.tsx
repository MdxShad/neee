'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

type Poster = { id: string; imageUrl: string; courseTag: string | null; universityTag: string | null };

export function PosterCard({ poster, consultancyName, personName, mobile }: { poster: Poster; consultancyName: string; personName: string; mobile: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [generated, setGenerated] = React.useState<string>('');

  async function generate() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = poster.imageUrl;
    await new Promise((res, rej) => {
      img.onload = () => res(null);
      img.onerror = rej;
    });

    const canvas = canvasRef.current!;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const pad = Math.max(14, Math.round(canvas.width * 0.02));
    const boxH = Math.round(canvas.height * 0.18);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(pad, canvas.height - boxH - pad, canvas.width - pad * 2, boxH);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(18, Math.round(canvas.width * 0.035))}px sans-serif`;
    ctx.fillText(consultancyName, pad * 2, canvas.height - boxH + pad * 1.5);
    ctx.font = `${Math.max(15, Math.round(canvas.width * 0.03))}px sans-serif`;
    ctx.fillText(personName, pad * 2, canvas.height - boxH + pad * 3.3);
    ctx.fillText(mobile || 'Mobile not set', pad * 2, canvas.height - boxH + pad * 5.0);

    setGenerated(canvas.toDataURL('image/png'));
  }

  function download() {
    if (!generated) return;
    const a = document.createElement('a');
    a.href = generated;
    a.download = `poster-${poster.id}.png`;
    a.click();
  }

  async function shareWhatsApp() {
    const text = `Check this poster from ${consultancyName}. Contact: ${personName} (${mobile || 'N/A'})`;
    if ((navigator as any).share && generated) {
      const blob = await (await fetch(generated)).blob();
      const file = new File([blob], `poster-${poster.id}.png`, { type: 'image/png' });
      try {
        await (navigator as any).share({ files: [file], text });
        return;
      } catch {
        // fallback
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n\nPlease attach downloaded poster image.`)}`, '_blank');
    alert('WhatsApp opened with message. Please attach downloaded image.');
  }

  return (
    <div className="rounded-md border border-zinc-200 p-3 space-y-3">
      <img src={generated || poster.imageUrl} alt="Poster" className="w-full rounded" />
      <div className="text-xs text-zinc-600">{poster.courseTag || '—'} / {poster.universityTag || '—'}</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={generate}>Generate branded</Button>
        <Button type="button" size="sm" variant="secondary" onClick={download} disabled={!generated}>Download PNG</Button>
        <Button type="button" size="sm" variant="ghost" onClick={shareWhatsApp}>Share WhatsApp</Button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
