'use client';

type AIInsight = {
  topStrength?: string;
  improvementArea?: string;
  recommendedAssignment?: string;
  latestReview?: string;
};

export function AIInsightCard({ insight }: { insight: AIInsight }) {
  const hasData = insight.topStrength || insight.improvementArea || insight.recommendedAssignment || insight.latestReview;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#D9A441]/10">
            <svg className="h-3.5 w-3.5 text-[#D9A441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-900">AI Insight</h3>
        </div>
        <div className="mt-4 flex flex-col items-center justify-center py-6">
          <svg className="h-10 w-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="mt-2 text-xs text-slate-400">Complete your profile for AI insights</p>
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Top Strength', value: insight.topStrength, icon: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Improvement Area', value: insight.improvementArea, icon: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Recommended Assignment', value: insight.recommendedAssignment, icon: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Latest Review', value: insight.latestReview, icon: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[#D9A441]/10">
          <svg className="h-3.5 w-3.5 text-[#D9A441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-900">AI Insight</h3>
      </div>
      <div className="mt-4 space-y-4">
        {items.filter(i => i.value).map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
              <svg className={`h-4 w-4 ${item.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <p className="text-sm text-slate-700">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
