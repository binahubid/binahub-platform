'use client';

import Link from 'next/link';
import { useOnboarding } from './context';

export function OnboardingModal() {
  const { currentStep, currentStepIndex, totalSteps, completedSteps, isVisible, skipAll, completeStep, completionPercent } = useOnboarding();

  if (!currentStep || !isVisible) return null;

  const stepNumber = completedSteps.length + 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={skipAll} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-[#0B2C6B] to-[#D9A441] transition-all duration-500"
            style={{ width: `${((stepNumber - 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={skipAll}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] shadow-lg shadow-[#0B2C6B]/25">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentStep.icon} />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#D9A441] uppercase tracking-wider">
                Langkah {stepNumber} dari {totalSteps}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{currentStep.title}</h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            {currentStep.description}
          </p>

          {/* CV special feature */}
          {currentStep.id === 'cv' && (
            <div className="mb-6 rounded-xl bg-gradient-to-r from-[#0B2C6B]/5 to-[#D9A441]/5 border border-[#0B2C6B]/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D9A441]/20 flex-shrink-0">
                  <svg className="h-4 w-4 text-[#D9A441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Fitur AI Kami</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    CV Anda akan dianalisis oleh AI untuk mengisi profil secara otomatis — termasuk keahlian, pengalaman, dan pendidikan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={currentStep.actionHref}
              onClick={() => completeStep(currentStep.id)}
              className="flex-1 rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#0A255A] px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-[#0B2C6B]/25 hover:from-[#0A255A] hover:to-[#071A33] transition-all"
            >
              {currentStep.actionLabel}
            </Link>
            <button
              onClick={skipAll}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Lewati
            </button>
          </div>

          {/* Progress dots */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const isCompletedStep = i < completedSteps.length;
              const isCurrent = i === completedSteps.length;
              return (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isCompletedStep
                      ? 'w-6 bg-[#0B2C6B]'
                      : isCurrent
                      ? 'w-6 bg-[#0B2C6B]/40'
                      : 'w-2 bg-slate-200'
                  }`}
                />
              );
            })}
          </div>

          {/* Completion percent */}
          <p className="mt-3 text-center text-xs text-slate-400">
            Profil Anda lengkap {completionPercent}%
          </p>
        </div>
      </div>
    </div>
  );
}
