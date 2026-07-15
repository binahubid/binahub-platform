'use client';

import Link from 'next/link';
import { useOnboarding } from './context';

const steps = [
  {
    id: 'cv',
    title: 'Unggah CV',
    description: 'Unggah CV untuk pengisian otomatis',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    href: '/dashboard/profile?tab=documents',
  },
  {
    id: 'profile',
    title: 'Lengkapi Profil',
    description: 'Isi data diri Anda',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    href: '/dashboard/profile',
  },
];

type OnboardingChecklistProps = {
  hasCV?: boolean;
  hasProfile?: boolean;
  hasCapability?: boolean;
};

export function OnboardingChecklist({
  hasCV,
  hasProfile,
  hasCapability,
}: OnboardingChecklistProps) {
  const { completedSteps, completionPercent: contextPercent, reopenModal, isCompleted: contextCompleted } = useOnboarding();

  // Dynamic status evaluation
  const stepsDone = {
    cv: hasCV ?? completedSteps.includes('cv'),
    profile: hasProfile ?? completedSteps.includes('profile'),
  };

  const doneCount = Object.values(stepsDone).filter(Boolean).length;
  const completionPercent = Math.round((doneCount / 2) * 100);
  const isCompleted = doneCount === 2;

  // Don't show if all completed
  if (isCompleted) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Lengkapi Profil Anda</h3>
          <p className="text-xs text-slate-500 mt-0.5">{completionPercent}% selesai</p>
        </div>
        <button
          onClick={reopenModal}
          className="text-xs font-semibold text-[#0B2C6B] hover:text-[#0A255A] transition-colors"
        >
          Lihat Panduan
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0B2C6B] to-[#D9A441] transition-all duration-500"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const isDone = stepsDone[step.id as keyof typeof stepsDone];
          return (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 transition-colors group"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isDone
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400 group-hover:bg-[#0B2C6B]/10 group-hover:text-[#0B2C6B]'
                }`}
              >
                {isDone ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-slate-400">{step.description}</p>
              </div>
              {!isDone && (
                <svg className="h-4 w-4 text-slate-300 group-hover:text-[#0B2C6B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
