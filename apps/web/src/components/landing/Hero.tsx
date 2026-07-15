'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

function Hero3DDashboard() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 8, rotateY: -12, translateX: 0, translateY: 0, translateZ: 0 });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.sqrt((rect.width / 2) ** 2 + (rect.height / 2) ** 2);
    const proximity = Math.min(1, dist / maxDist);

    const backAway = (1 - proximity) * 20;
    const pushX = dist === 0 ? 0 : (dx / dist) * backAway * -0.55;
    const pushY = dist === 0 ? 0 : (dy / dist) * backAway * -0.55;
    const angleY = (dx / rect.width) * -6;
    const angleX = (dy / rect.height) * 6;

    setTilt({
      rotateX: 8 + angleX,
      rotateY: -12 + angleY,
      translateX: pushX,
      translateY: pushY,
      translateZ: backAway * -0.5,
    });
  };

  const handleLeave = () => {
    setTilt({ rotateX: 8, rotateY: -12, translateX: 0, translateY: 0, translateZ: 0 });
  };

  return (
    <div
      ref={stageRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="relative flex aspect-[4/3] w-full items-center justify-center"
      style={{ perspective: '1400px', touchAction: 'none' }}
    >
      {/* Layer 1 (back) - shadow/decorative card */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate3d(${tilt.translateX}px, ${tilt.translateY}px, ${tilt.translateZ}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="h-full w-full rounded-2xl border border-slate-200/60 bg-slate-100"
          style={{ transform: 'translateZ(-40px) translateX(16px) translateY(16px)', opacity: 0.7 }}
        />
      </div>

      {/* Layer 2 (middle) - secondary card peeking out */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate3d(${tilt.translateX}px, ${tilt.translateY}px, ${tilt.translateZ}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
          style={{ transform: 'translateZ(-20px) translateX(8px) translateY(8px)' }}
        >
          <div className="p-5 opacity-60">
            <div className="mb-4 h-2.5 w-32 rounded bg-slate-200" />
            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="h-14 rounded-lg bg-slate-100" />
              <div className="h-14 rounded-lg bg-slate-100" />
              <div className="h-14 rounded-lg bg-slate-100" />
            </div>
            <div className="h-16 w-full rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>

      {/* Layer 3 (front) - main dashboard card */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate3d(${tilt.translateX}px, ${tilt.translateY}px, ${tilt.translateZ}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-slate-200" />
              <div className="h-2 w-2 rounded-full bg-slate-200" />
              <div className="h-2 w-2 rounded-full bg-slate-200" />
            </div>
            <div className="mx-auto text-[11px] font-medium text-slate-400">
              app.binahub.id/dashboard
            </div>
          </div>

          {/* Dashboard content */}
          <div className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Selamat datang, Budi</div>
                <div className="mt-0.5 text-xs text-slate-500">Senior Trainer, PT Bina Bangsa</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B2C6B]/8 text-xs font-bold text-[#0B2C6B]">
                BA
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-slate-100 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Profile</div>
                <div className="mt-1 text-lg font-bold text-slate-900">92%</div>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-100">
                  <div className="h-1 rounded-full bg-[#0B2C6B]" style={{ width: '92%' }} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Capability</div>
                <div className="mt-1 text-lg font-bold text-slate-900">4.8</div>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-100">
                  <div className="h-1 rounded-full bg-[#D9A441]" style={{ width: '96%' }} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 p-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Active</div>
                <div className="mt-1 text-lg font-bold text-slate-900">3</div>
                <div className="mt-2 h-1 w-full rounded-full bg-slate-100">
                  <div className="h-1 rounded-full bg-emerald-500" style={{ width: '60%' }} />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Upcoming Assignment
                </div>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  3 hari lagi
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                  LB
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">Leadership Training</div>
                  <div className="text-xs text-slate-500">PT Bina Bangsa, 12 peserta</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floor shadow */}
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 h-5 w-3/4 -translate-x-1/2 rounded-full bg-slate-900/15 blur-2xl transition-opacity duration-300"
        style={{ opacity: tilt.translateZ < 0 ? 0.3 : 0.5 }}
        aria-hidden="true"
      />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-grid-slate [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)] opacity-60" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* Left */}
          <div className="animate-slideUp">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9A441]">
              Associate Management System
            </span>

            <h1 className="mt-6 text-[2.5rem] font-light leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-5xl lg:text-[3.5rem]">
              Sistem Kelola profil profesional Associate BinaHub.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Platform yang mendukung associate mulai dari pendaftaran, penugasan, dan evaluasi diri.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/20 transition-all hover:from-[#0A255A] hover:to-[#071A33] hover:shadow-xl hover:shadow-[#0B2C6B]/30"
              >
                Daftar Sebagai Associate
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Masuk
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Gratis untuk associate</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Tanpa kartu kredit</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Siap dalam 2 menit</span>
              </div>
            </div>
          </div>

          {/* Right: 3-layer 3D dashboard */}
          <div className="animate-slideUp" style={{ animationDelay: '100ms' }}>
            <Hero3DDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}
