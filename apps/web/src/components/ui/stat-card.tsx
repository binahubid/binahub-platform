import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = '',
}: {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
}) {
  const changeColors = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-red-500 bg-red-50',
    neutral: 'text-slate-500 bg-slate-50',
  };

  const arrow = {
    positive: '↑',
    negative: '↓',
    neutral: '→',
  };

  return (
    <div
      className={`group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          {change && (
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${changeColors[changeType]}`}
            >
              <span aria-hidden="true">{arrow[changeType]}</span>
              {change}
            </span>
          )}
        </div>
        {icon && (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B2C6B] to-[#1440a0] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
