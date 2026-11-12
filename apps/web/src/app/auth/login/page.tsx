'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AppBootLogo } from '@/components/ui/app-boot-logo';
import { supabase } from '@/lib/supabase-client';
import { notificationLoginReturn } from '@/lib/notification-client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const registered = searchParams.get('registered');
  const confirmed = searchParams.get('confirmed');
  const newUser = searchParams.get('newUser');

  useEffect(() => {
    if (registered) setSuccess('Akun berhasil dibuat. Cek email untuk verifikasi.');
    if (confirmed) setSuccess('Email terverifikasi. Silakan masuk.');
  }, [registered, confirmed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(
        signInError.message.includes('Email not confirmed')
          ? 'Email belum diverifikasi. Cek kotak masuk Anda.'
          : signInError.message
      );
      setLoading(false);
      return;
    }

    const returnToNotice = notificationLoginReturn();
    if (returnToNotice) {
      router.replace(returnToNotice);
      return;
    }
    const role = signInData.user?.app_metadata?.role;
    if (role === 'admin' || role === 'reviewer') {
      router.push(role === 'reviewer' ? '/admin/reviews' : '/admin');
      return;
    }

    // Jika flag onboarding ada (dari sessionStorage atau URL param), langsung ke onboarding
    const sessionFlag = typeof window !== 'undefined' && sessionStorage.getItem('ams_needs_onboarding') === 'true';
    if (sessionFlag || newUser === 'true') {
      if (typeof window !== 'undefined') sessionStorage.removeItem('ams_needs_onboarding');
      router.push('/onboarding');
      return;
    }

    // Cek profil apakah perlu diarahkan ke onboarding
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/associate/me`, {
        headers: { Authorization: `Bearer ${signInData.session?.access_token}` },
      });
      const json = await res.json();
      const assoc = json.data;
      const isDraftNewUser =
        json.success &&
        assoc?.status === 'draft' &&
        (!assoc.profile?.roles || assoc.profile.roles.length === 0) &&
        (!assoc.experiences || assoc.experiences.length === 0);

      router.push(isDraftNewUser ? '/onboarding' : '/dashboard');
    } catch {
      router.push('/dashboard');
    }
  };


  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-white px-5 py-8 sm:bg-slate-50 sm:py-10">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="mb-6 inline-flex min-h-11 items-center">
          <Image src="/full-logo.png" alt="BinaHub" width={120} height={34} className="h-auto w-[120px]" priority />
        </Link>

        <div className="sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-7">
          <h1 className="mb-6 text-[1.65rem] font-semibold leading-tight tracking-tight text-slate-900">
            Masuk ke AMS
          </h1>

          {/* Success */}
          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs leading-relaxed text-emerald-700">{success}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs leading-relaxed text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder-slate-400 transition-all focus:border-[#0B2C6B] focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/10"
                placeholder="nama@binahub.id"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Kata sandi
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-12 text-base text-slate-900 placeholder-slate-400 transition-all focus:border-[#0B2C6B] focus:outline-none focus:ring-2 focus:ring-[#0B2C6B]/10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg text-slate-600 hover:text-[#0B2C6B]"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L3.42 3.42m6.46 6.46l6.46 6.46M21 21l-3.42-3.42m0 0a9.953 9.953 0 003.42-3.42M3.42 3.42L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/auth/forgot-password"
                className="inline-flex min-h-11 items-center text-sm font-medium text-[#0B2C6B] hover:underline"
              >
                Lupa kata sandi?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#123575] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Memproses...</span>
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div aria-hidden="true" className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            atau
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
          >
            {googleLoading ? (
              <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="text-sm">{googleLoading ? 'Mengalihkan...' : 'Masuk dengan Google'}</span>
          </button>

        </div>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link href="/auth/register" className="inline-flex min-h-11 items-center font-semibold text-[#0B2C6B] hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<AppBootLogo />}
    >
      <LoginForm />
    </Suspense>
  );
}
