'use client';

import { useOnboarding } from './context';

export function ReminderBar() {
  const { isCompleted, isDisabled, isVisible, reopenPopup, disableOnboarding, reminderTimeLeft } = useOnboarding();

  if (isCompleted || isDisabled || isVisible) return null;

  const minutes = Math.floor(reminderTimeLeft / 60);
  const seconds = reminderTimeLeft % 60;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B2C6B]/10">
          <svg className="h-4 w-4 text-[#0B2C6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="text-xs">
          <p className="font-medium text-slate-700">
            We&apos;ll remind you again in {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
          <p className="text-slate-400">You can turn off these tips in Settings</p>
        </div>
        <button
          onClick={reopenPopup}
          className="rounded-lg bg-[#0B2C6B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A255A] transition-colors"
        >
          Resume
        </button>
        <button
          onClick={disableOnboarding}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="Turn off tips"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
