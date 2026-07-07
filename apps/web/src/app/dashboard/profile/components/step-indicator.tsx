'use client';

type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
  steps: { label: string; icon: string }[];
};

export function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const isLast = i === steps.length - 1;
          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isCurrent
                      ? 'border-[#0B2C6B] bg-[#0B2C6B] text-white shadow-lg shadow-[#0B2C6B]/25'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                    </svg>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                    isCurrent ? 'text-[#0B2C6B]' : isDone ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 mx-3 mt-[-20px]">
                  <div
                    className={`h-0.5 transition-all duration-300 ${
                      isDone ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-[#0B2C6B]">
            Langkah {currentStep + 1} dari {totalSteps}
          </span>
          <span className="text-xs text-slate-500">{steps[currentStep]?.label}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0B2C6B] to-[#D9A441] transition-all duration-500"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
