import Link from 'next/link';

type ServiceErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function ServiceError({
  title = 'Data belum dapat dimuat',
  message,
  onRetry,
  retrying = false,
  className = '',
}: ServiceErrorProps) {
  return (
    <div
      role="alert"
      className={`flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-rose-200 bg-white px-6 py-12 text-center shadow-sm ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.33 17c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">{message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A255A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? 'Mencoba lagi...' : 'Coba lagi'}
          </button>
        )}
        <Link
          href="/status"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Lihat status sistem
        </Link>
      </div>
    </div>
  );
}
