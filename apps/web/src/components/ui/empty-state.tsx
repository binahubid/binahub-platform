import Link from 'next/link';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionHref,
  actionLabel,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      {icon ?? (
        <svg className="h-12 w-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h7m4-9a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      <p className="mt-3 text-sm font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>}
      {(action || actionHref) && (
        <div className="mt-4">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B2C6B] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0A255A]"
            >
              {actionLabel}
            </Link>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}
