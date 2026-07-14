'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function CompleteIllustration({ mounted }: { mounted: boolean }) {
  return (
    <svg
      viewBox="0 0 280 200"
      fill="none"
      className={`w-full max-w-xs mx-auto transition-all duration-700 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circles */}
      <circle cx="140" cy="100" r="80" fill="#eef2ff" />
      <circle cx="140" cy="100" r="60" fill="#e0e7ff" />

      {/* Profile card */}
      <rect x="90" y="60" width="100" height="80" rx="10" fill="white" filter="url(#shadow1)" />
      <defs>
        <filter id="shadow1" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0B2C6B" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Avatar circle */}
      <circle cx="140" cy="86" r="16" fill="#0B2C6B" />
      <circle cx="140" cy="81" r="6" fill="white" opacity="0.9" />
      <ellipse cx="140" cy="94" rx="10" ry="7" fill="white" opacity="0.9" />

      {/* Name lines */}
      <rect x="115" y="108" width="50" height="5" rx="2.5" fill="#1e293b" />
      <rect x="122" y="118" width="36" height="4" rx="2" fill="#94a3b8" />
      <rect x="126" y="127" width="28" height="4" rx="2" fill="#D9A441" />

      {/* Checkmark badge */}
      <circle cx="186" cy="62" r="14" fill="#059669" />
      <path d="M180 62l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Floating elements */}
      <rect x="40" y="78" width="36" height="28" rx="6" fill="white" filter="url(#shadow1)" className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <animate attributeName="y" values="78;74;78" dur="3s" repeatCount="indefinite" />
      </rect>
      <circle cx="48" cy="88" r="5" fill="#D9A441">
        <animate attributeName="cy" values="88;84;88" dur="3s" repeatCount="indefinite" />
      </circle>
      <rect x="57" y="85" width="15" height="3" rx="1.5" fill="#cbd5e1">
        <animate attributeName="y" values="85;81;85" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="57" y="91" width="12" height="3" rx="1.5" fill="#e2e8f0">
        <animate attributeName="y" values="91;87;91" dur="3s" repeatCount="indefinite" />
      </rect>

      <rect x="204" y="90" width="36" height="28" rx="6" fill="white" filter="url(#shadow1)" className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <animate attributeName="y" values="90;86;90" dur="3.5s" repeatCount="indefinite" />
      </rect>
      <circle cx="212" cy="100" r="5" fill="#0B2C6B" opacity="0.7">
        <animate attributeName="cy" values="100;96;100" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <rect x="221" y="97" width="15" height="3" rx="1.5" fill="#cbd5e1">
        <animate attributeName="y" values="97;93;97" dur="3.5s" repeatCount="indefinite" />
      </rect>
      <rect x="221" y="103" width="10" height="3" rx="1.5" fill="#e2e8f0">
        <animate attributeName="y" values="103;99;103" dur="3.5s" repeatCount="indefinite" />
      </rect>

      {/* Stars */}
      <circle cx="68" cy="55" r="3" fill="#D9A441" opacity="0.7">
        <animate attributeName="r" values="2;3.5;2" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="215" cy="60" r="2" fill="#0B2C6B" opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="155" r="3" fill="#D9A441" opacity="0.5">
        <animate attributeName="r" values="2;4;2" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function StepComplete({ name }: { name: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const firstName = name?.split(' ')[0] || 'Selamat datang';

  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <CompleteIllustration mounted={mounted} />

      <div className={`space-y-1.5 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <h2 className="text-xl font-bold text-slate-900">Profil Anda sudah aktif, {firstName}!</h2>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Data dari CV telah tersimpan. Anda bisa melengkapi detail lainnya kapan saja dari dashboard.
        </p>
      </div>

      {/* Summary */}
      <div className={`w-full grid grid-cols-3 gap-3 transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        {[
          { label: 'Profil', sublabel: 'Data diri', icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )},
          { label: 'CV', sublabel: 'Terunggah', icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )},
          { label: 'Peran', sublabel: 'Terdefinisi', icon: (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )},
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
            <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B2C6B]/8 text-[#0B2C6B]">
              {item.icon}
            </div>
            <p className="text-xs font-semibold text-slate-800">{item.label}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{item.sublabel}</p>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className={`w-full space-y-2.5 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0B2C6B] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0A255A] transition-colors"
        >
          Mulai Jelajahi Dashboard
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={() => router.push('/dashboard/profile')}
          className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Lengkapi Profil Lebih Lanjut
        </button>
      </div>
    </div>
  );
}
