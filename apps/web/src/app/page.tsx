'use client';

import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Benefits } from '../components/landing/Benefits';
import { FAQ } from '../components/landing/FAQ';
import { CTA } from '../components/landing/CTA';
import { Footer } from '../components/landing/Footer';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <svg className="h-7 w-7 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        {user && (
          <div className="mx-auto max-w-7xl px-5 sm:px-8 mb-8">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-sm text-slate-600">
                Anda sudah masuk. <span className="font-medium text-slate-900">Lanjutkan ke dashboard.</span>
              </p>
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#0B2C6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a255a]"
              >
                Buka Dashboard
              </Link>
            </div>
          </div>
        )}
        <HowItWorks />
        <Benefits />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
