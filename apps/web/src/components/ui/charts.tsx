'use client';

export function SimpleLineChart({
  data,
  height = 200,
  color = '#0B2C6B',
  className = '',
}: {
  data: number[];
  height?: number;
  color?: string;
  className?: string;
}) {
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-slate-50 h-[${height}px] ${className}`}>
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 400;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const points = data
    .map((value, index) => {
      const x = padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((value - min) / range) * (height - padding.top - padding.bottom);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${padding.left},${height - padding.bottom} ${points} ${width - padding.right},${height - padding.bottom}`;

  const gridLines = 4;
  const gridStep = range / gridLines;

  return (
    <div className={`w-full ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: height }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const val = min + i * gridStep;
          const y = height - padding.bottom - ((val - min) / range) * (height - padding.top - padding.bottom);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(val)}</text>
            </g>
          );
        })}
        <polygon points={areaPoints} fill="url(#lineGradient)" />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((value, index) => {
          const x = padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
          const y = height - padding.bottom - ((value - min) / range) * (height - padding.top - padding.bottom);
          return <circle key={index} cx={x} cy={y} r="3" fill={color} />;
        })}
      </svg>
    </div>
  );
}

export function SimpleBarChart({
  data,
  height = 200,
  color = '#0B2C6B',
  labels = [],
  className = '',
}: {
  data: number[];
  height?: number;
  color?: string;
  labels?: string[];
  className?: string;
}) {
  if (!data.length) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-slate-50 h-[${height}px] ${className}`}>
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const width = 400;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / data.length;
  const barGap = barWidth * 0.3;
  const barActualWidth = barWidth - barGap;

  const gridLines = 4;
  const gridStep = max / gridLines;

  return (
    <div className={`w-full ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: height }}>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const val = i * gridStep;
          const y = height - padding.bottom - (val / max) * chartHeight;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(val)}</text>
            </g>
          );
        })}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#cbd5e1" strokeWidth="1" />
        {data.map((value, index) => {
          const barHeight = (value / max) * chartHeight;
          const x = padding.left + index * barWidth + barGap / 2;
          const y = height - padding.bottom - barHeight;
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barActualWidth}
                height={barHeight}
                fill={color}
                rx="3"
                opacity="0.85"
              />
              <text
                x={x + barActualWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#475569"
                fontWeight="600"
              >
                {value}
              </text>
              {labels[index] && (
                <text
                  x={x + barActualWidth / 2}
                  y={height - padding.bottom + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {labels[index]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 24,
  className = '',
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  if (!data.length || total === 0) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">0</span>
            <span className="text-xs text-slate-500">Total</span>
          </div>
        </div>
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    );
  }

  let cumulativePercentage = 0;

  return (
    <div className={`flex items-start gap-6 ${className}`}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const offset = circumference - (cumulativePercentage / 100) * circumference;
            cumulativePercentage += percentage;
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 min-w-0">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-slate-600 truncate">{item.label}</span>
            <span className="text-sm font-medium text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
