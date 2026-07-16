'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const role = session.user?.app_metadata?.role;

        if (role === 'admin') {
          router.push('/admin');
          return;
        }

        // Cek flag onboarding dari sessionStorage (di-set saat register)
        const needsOnboarding =
          typeof window !== 'undefined' &&
          sessionStorage.getItem('ams_needs_onboarding') === 'true';

        if (needsOnboarding) {
          sessionStorage.removeItem('ams_needs_onboarding');
          router.push('/onboarding');
          return;
        }

        // Untuk OAuth (Google): cek apakah akun baru berdasarkan event
        // SIGNED_IN setelah INITIAL_SESSION tidak ada → kemungkinan baru
        if (event === 'SIGNED_IN') {
          const createdAt = new Date(session.user.created_at).getTime();
          const now = Date.now();
          const isNewUser = now - createdAt < 5 * 60 * 1000; // dalam 5 menit terakhir

          if (isNewUser) {
            router.push('/onboarding');
            return;
          }
        }

        router.push('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        router.push('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B2C6B]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
          <svg className="animate-spin h-8 w-8 text-[#D9A441]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-white text-sm">Menyiapkan akun Anda...</p>
        <p className="text-white/50 text-xs mt-1">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}
