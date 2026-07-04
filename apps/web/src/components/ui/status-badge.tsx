const statusConfig = {
  draft: {
    label: 'Draft',
    classes: 'bg-slate-100 text-slate-700',
    dot: 'bg-slate-400',
  },
  pending_review: {
    label: 'Under Review',
    classes: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-400',
  },
  approved: {
    label: 'Approved',
    classes: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-400',
  },
  active: {
    label: 'Active',
    classes: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-400',
  },
  inactive: {
    label: 'Inactive',
    classes: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  },
  suspended: {
    label: 'Suspended',
    classes: 'bg-red-50 text-red-700',
    dot: 'bg-red-400',
  },
  on_assignment: {
    label: 'On Assignment',
    classes: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-400',
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
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${config.classes} ${className}`}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      )}
      {config.label}
    </span>
  );
}
