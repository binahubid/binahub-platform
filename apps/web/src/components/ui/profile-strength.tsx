'use client';

import Link from 'next/link';

type ProfileStrengthProps = {
  percentage: number;
  hasCV: boolean;
  hasExperience: boolean;
  hasSkills: boolean;
  hasCertifications: boolean;
  hasPortfolio: boolean;
  hasEducation: boolean;
};

export function ProfileStrength({
  percentage,
  hasCV,
  hasExperience,
  hasSkills,
  hasCertifications,
  hasPortfolio,
  hasEducation,
}: ProfileStrengthProps) {
  const items = [
    { label: 'Unggah CV', done: hasCV, href: '/dashboard/profile?tab=documents' },
    { label: 'Tambah Pengalaman Kerja', done: hasExperience, href: '/dashboard/profile?tab=experience' },
    { label: 'Tambah Keahlian', done: hasSkills, href: '/dashboard/profile?tab=skills' },
    { label: 'Tambah Sertifikasi', done: hasCertifications, href: '/dashboard/profile?tab=certifications' },
    { label: 'Tambah Portofolio', done: hasPortfolio, href: '/dashboard/profile?tab=portfolio' },
    { label: 'Tambah Pendidikan', done: hasEducation, href: '/dashboard/profile?tab=education' },
  ];

  const getStatus = () => {
    if (percentage >= 80) return 'Luar Biasa!';
    if (percentage >= 50) return 'Hampir Selesai!';
    if (percentage >= 25) return 'Baru Dimulai';
    return 'Mulai Melengkapi';
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Kekuatan Profil</h3>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold text-[#0B2C6B]">{percentage}%</span>
        <span className="mb-1 text-xs text-slate-500">{getStatus()}</span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#0B2C6B] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 group"
          >
            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
              item.done
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-slate-300 group-hover:border-[#0B2C6B]'
            }`}>
              {item.done && (
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-xs ${
              item.done ? 'text-slate-400 line-through' : 'text-slate-600 group-hover:text-[#0B2C6B]'
            }`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
