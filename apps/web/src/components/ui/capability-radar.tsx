'use client';

import { useEffect, useRef } from 'react';

type CapabilityData = {
  label: string;
  score: number;
  confidence?: number;
  evidence?: string;
};

export function CapabilityRadar({ data, size = 280 }: { data: CapabilityData[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 40;
    const n = data.length;
    const angleStep = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, size, size);

    // Grid rings
    for (let ring = 1; ring <= 5; ring++) {
      const r = (maxR * ring) / 5;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = angleStep * i - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = ring === 5 ? '#cbd5e1' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
      const angle = angleStep * i - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const r = (maxR * data[i].score) / 100;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(11, 44, 107, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#0B2C6B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points
    for (let i = 0; i < n; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const r = (maxR * data[i].score) / 100;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0B2C6B';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = '#475569';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const angle = angleStep * i - Math.PI / 2;
      const labelR = maxR + 24;
      const x = cx + labelR * Math.cos(angle);
      const y = cy + labelR * Math.sin(angle);
      ctx.fillText(data[i].label, x, y);
    }
  }, [data, size]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <svg className="h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p className="mt-2 text-sm text-slate-400">Complete your profile to see capability scores</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
    </div>
  );
}

export function CapabilityScoreList({ data }: { data: CapabilityData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-28 text-xs font-medium text-slate-600">{item.label}</span>
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#0B2C6B]" style={{ width: `${item.score}%` }} />
            </div>
          </div>
          <span className="w-10 text-right text-xs font-semibold text-slate-900">{item.score}</span>
        </div>
      ))}
    </div>
  );
}
