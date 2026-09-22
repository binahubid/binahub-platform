'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError('Tautan pemulihan belum dapat dikirim. Periksa alamat email lalu coba lagi.');
      return;
    }
    // Deliberately use the same response for registered and unregistered emails.
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <Link href="/auth/login" className="mb-8 flex items-center gap-2 text-[#0B2C6B]">
          <Image src="/logo.png" alt="BinaApps" width={32} height={32} className="rounded-md" priority />
          <span className="font-bold">BinaApps</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Pulihkan password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Masukkan email akun. Kami akan mengirim tautan untuk membuat password baru.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            Jika email tersebut terdaftar, tautan pemulihan sudah dikirim. Periksa inbox dan folder spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10"
                placeholder="nama@perusahaan.com"
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#082456] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Mengirim...' : 'Kirim tautan pemulihan'}
            </button>
          </form>
        )}

        <Link href="/auth/login" className="mt-6 inline-flex text-sm font-semibold text-[#0B2C6B] hover:underline">
          Kembali ke halaman masuk
        </Link>
      </section>
    </main>
  );
}
