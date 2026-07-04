'use client';

import Link from 'next/link';

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-slate-200/70 bg-[#0B2C6B] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-40" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="eyebrow-line text-xs font-semibold uppercase tracking-[0.2em] text-[#D9A441]">
              Mulai hari ini
            </span>
            <h2 className="mt-4 text-3xl font-light leading-[1.1] tracking-[-0.025em] text-white sm:text-4xl md:text-5xl">
              Siap memulai perjalanan<br />profesional Anda?
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-slate-300">
            Bergabung dengan ribuan associate yang telah membangun karir mereka di ekosistem BinaHub. Gratis selamanya untuk associate.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <Link
            href="/auth/register"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#0B2C6B] transition hover:bg-slate-100"
          >
            Daftar Sekarang
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </section>
  );
}
