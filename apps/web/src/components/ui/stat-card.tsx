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
  icon?: React.ReactNode;
  className?: string;
}) {
  const changeColors = {
    positive: 'text-emerald-600',
    negative: 'text-red-500',
    neutral: 'text-slate-500',
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#0B2C6B]">
            {value}
          </p>
          {change && (
            <p className={`mt-1 text-xs font-medium ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0B2C6B]/5 text-[#0B2C6B]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
