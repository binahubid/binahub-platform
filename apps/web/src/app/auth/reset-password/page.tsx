'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setReady(Boolean(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || session)) setReady(Boolean(session));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (password !== confirmation) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError('Password belum dapat diperbarui. Tautan mungkin sudah kedaluwarsa; minta tautan baru.');
      return;
    }
    setComplete(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-8 flex items-center gap-2 text-[#0B2C6B]">
          <Image src="/logo.png" alt="BinaApps" width={32} height={32} className="rounded-md" priority />
          <span className="font-bold">BinaApps</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Buat password baru</h1>

        {complete ? (
          <div className="mt-6">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Password berhasil diperbarui. Anda dapat masuk menggunakan password baru.
            </p>
            <Link href="/auth/login" className="mt-5 inline-flex rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white">
              Masuk ke akun
            </Link>
          </div>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password baru</label>
              <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10" />
            </div>
            <div>
              <label htmlFor="confirmation" className="mb-1.5 block text-sm font-medium text-slate-700">Ulangi password baru</label>
              <input id="confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2C6B] focus:ring-2 focus:ring-[#0B2C6B]/10" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Simpan password baru'}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Tautan pemulihan tidak valid atau sudah kedaluwarsa.{' '}
            <Link href="/auth/forgot-password" className="font-semibold underline">Minta tautan baru</Link>.
          </div>
        )}
      </section>
    </main>
  );
}
