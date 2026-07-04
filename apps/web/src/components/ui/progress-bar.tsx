export function ProgressBar({
  value,
  color = '#0B2C6B',
  height = 'h-2',
  showLabel = false,
  className = '',
}: {
  value: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct === 100 ? '#10b981' : color;

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Progress</span>
          <span className="font-medium text-slate-700">{pct}%</span>
        </div>
      )}
      <div
        className={`${height} overflow-hidden rounded-full bg-slate-100`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  color = '#0B2C6B',
  className = '',
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={pct === 100 ? '#10b981' : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-semibold text-slate-700">
        {pct}%
      </span>
    </div>
  );
}
