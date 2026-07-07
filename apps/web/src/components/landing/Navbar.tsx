'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image src="/logo.png" alt="BinaHub" width={28} height={28} className="rounded transition group-hover:opacity-80" priority />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            BinaHub
          </span>
          <span className="hidden uppercase rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 sm:inline">
            AMS
          </span>
        </Link>

        <div className="flex items-center gap-7">
          <a href="#alur" className="group relative hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:block">
            Cara Kerja
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-slate-900 transition-all duration-200 group-hover:w-full" />
          </a>
          <a href="#faq" className="group relative hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:block">
            FAQ
            <span className="absolute -bottom-1 left-0 h-px w-0 bg-slate-900 transition-all duration-200 group-hover:w-full" />
          </a>
          <Link href="/auth/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
            Masuk
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-[#0A255A] hover:to-[#071A33] hover:shadow-md"
          >
            Daftar
          </Link>
        </div>
      </div>
    </nav>
  );
}
