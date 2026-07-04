'use client';

import Link from 'next/link';
import { CircularProgress } from './progress-bar';

type MissingItem = {
  label: string;
  href?: string;
};

export function ProfileCompletion({
  percentage,
  missing,
}: {
  percentage: number;
  missing: MissingItem[];
}) {
  const getColor = () => {
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-red-500';
  };

  const getLabel = () => {
    if (percentage >= 80) return 'Great progress!';
    if (percentage >= 50) return 'Good progress';
    return 'Get started';
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Profile Completion</h3>
      <div className="mt-4 flex items-center gap-4">
        <CircularProgress value={percentage} size={64} strokeWidth={5} />
        <div>
          <p className={`text-lg font-bold ${getColor()}`}>{percentage}%</p>
          <p className="text-xs text-slate-500">{getLabel()}</p>
        </div>
      </div>
      {missing.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Missing:</p>
          <ul className="space-y-1">
            {missing.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <svg className="h-3.5 w-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {item.label}
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/profile"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0B2C6B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A255A] transition-colors"
          >
            Complete Now
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
