'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="BinaHub" width={26} height={26} className="rounded" />
              <span className="text-base font-semibold text-slate-900">BinaHub</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Platform manajemen associate untuk ekosistem BinaHub.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#alur" className="text-slate-600 transition hover:text-slate-900">Cara Kerja</a></li>
              <li><a href="#faq" className="text-slate-600 transition hover:text-slate-900">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Akun</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/auth/login" className="text-slate-600 transition hover:text-slate-900">Masuk</Link></li>
              <li><Link href="/auth/register" className="text-slate-600 transition hover:text-slate-900">Daftar</Link></li>
              <li><Link href="/dashboard" className="text-slate-600 transition hover:text-slate-900">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Perusahaan</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="https://binahub.id" target="_blank" rel="noopener noreferrer" className="text-slate-600 transition hover:text-slate-900">Website</a></li>
              <li><a href="https://binahub.id/about" target="_blank" rel="noopener noreferrer" className="text-slate-600 transition hover:text-slate-900">Tentang</a></li>
              <li><a href="mailto:hello@binahub.id" className="text-slate-600 transition hover:text-slate-900">Kontak</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} BinaHub. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <a href="https://binahub.id/privacy" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-900">Kebijakan Privasi</a>
            <a href="https://binahub.id/terms" target="_blank" rel="noopener noreferrer" className="transition hover:text-slate-900">Syarat & Ketentuan</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
