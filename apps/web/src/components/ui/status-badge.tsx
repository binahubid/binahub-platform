const statusConfig = {
  draft: {
    label: 'Draft',
    classes: 'bg-slate-50 text-slate-600 ring-slate-200',
    dot: 'bg-slate-400',
    pulse: false,
  },
  pending_review: {
    label: 'Under Review',
    classes: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
    pulse: true,
  },
  approved: {
    label: 'Approved',
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    pulse: false,
  },
  active: {
    label: 'Active',
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    pulse: false,
  },
  inactive: {
    label: 'Inactive',
    classes: 'bg-slate-50 text-slate-500 ring-slate-200',
    dot: 'bg-slate-400',
    pulse: false,
  },
  suspended: {
    label: 'Suspended',
    classes: 'bg-red-50 text-red-700 ring-red-200',
    dot: 'bg-red-500',
    pulse: false,
  },
  on_assignment: {
    label: 'On Assignment',
    classes: 'bg-blue-50 text-blue-700 ring-blue-200',
    dot: 'bg-blue-500',
    pulse: false,
  },
} as const;

type Status = keyof typeof statusConfig;

export function StatusBadge({
  status,
  showDot = true,
  size = 'sm',
  className = '',
}: {
  status: Status | string;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const config = statusConfig[status as Status] || statusConfig.draft;
  
  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${sizeClasses[size]} ${config.classes} ${className}`}
    >
      {showDot && (
        <span className={`relative flex h-1.5 w-1.5 ${config.pulse ? '' : ''}`}>
          {config.pulse && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.dot}`} />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${config.dot}`} />
        </span>
      )}
      {config.label}
    </span>
  );
}
