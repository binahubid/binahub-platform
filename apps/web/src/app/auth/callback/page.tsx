'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const handled = useRef(false);
  const [error, setError] = useState('');

  const continueWithSession = useCallback((session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
    if (!session || handled.current) return false;
    handled.current = true;

    const role = session.user?.app_metadata?.role;
    if (role === 'admin' || role === 'reviewer') {
      router.replace(role === 'reviewer' ? '/admin/reviews' : '/admin');
      return true;
    }

    const needsOnboarding = sessionStorage.getItem('ams_needs_onboarding') === 'true';
    if (needsOnboarding) {
      sessionStorage.removeItem('ams_needs_onboarding');
      router.replace('/onboarding');
      return true;
    }

    const createdAt = new Date(session.user.created_at).getTime();
    const isNewUser = Number.isFinite(createdAt) && Date.now() - createdAt < 5 * 60 * 1000;
    router.replace(isNewUser ? '/onboarding' : '/dashboard');
    return true;
  }, [router]);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) continueWithSession(session);
    });

    // A session may already exist before the listener is attached. Reading it
    // immediately prevents a valid OAuth callback from hanging indefinitely.
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError('Sesi masuk tidak dapat diverifikasi. Silakan ulangi proses masuk.');
        return;
      }
      if (data.session) continueWithSession(data.session);
    });

    const timeout = window.setTimeout(() => {
      if (active && !handled.current) {
        setError('Proses masuk belum selesai. Silakan coba lagi agar sesi dibuat ulang dengan aman.');
      }
    }, 12000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [continueWithSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B2C6B]">
      <div className="text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <svg className={`h-8 w-8 text-[#D9A441] ${error ? '' : 'animate-spin'}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white">{error ? 'Proses masuk belum berhasil' : 'Menyiapkan akun Anda...'}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-white/60">
          {error || 'Mohon tunggu sebentar. Jangan tutup halaman ini.'}
        </p>
        {error && (
          <button
            type="button"
            onClick={() => router.replace('/auth/login')}
            className="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0B2C6B] transition hover:bg-slate-100"
          >
            Kembali ke halaman masuk
          </button>
        )}
      </div>
    </div>
  );
}
