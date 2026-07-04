'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useOnboarding } from './context';

type TooltipPosition = {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  arrow: 'top' | 'bottom' | 'left' | 'right';
};

function calculatePosition(targetId: string, preferred: string): TooltipPosition | null {
  if (typeof window === 'undefined') return null;
  const el = document.getElementById(targetId);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const tooltipWidth = 320;
  const tooltipHeight = 200;
  const gap = 12;

  // Default: right side
  let top = rect.top + rect.height / 2 - tooltipHeight / 2;
  let left = rect.right + gap;
  let arrow: 'top' | 'bottom' | 'left' | 'right' = 'left';

  // Check if it fits on the right
  if (left + tooltipWidth > window.innerWidth - 20) {
    // Try left side
    left = rect.left - tooltipWidth - gap;
    arrow = 'right';
    if (left < 20) {
      // Try below
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      top = rect.bottom + gap;
      arrow = 'top';
      if (top + tooltipHeight > window.innerHeight - 20) {
        // Try above
        top = rect.top - tooltipHeight - gap;
        arrow = 'bottom';
      }
    }
  }

  // Ensure within bounds
  top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));
  left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));

  return { top, left, arrow };
}

export function OnboardingTooltip() {
  const { currentStep, currentStepIndex, totalSteps, completedSteps, isVisible, closePopup, skipStep, completeStep } = useOnboarding();
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentStep || !isVisible) return;

    const updatePosition = () => {
      const newPos = calculatePosition(currentStep.targetId, currentStep.position);
      setPos(newPos);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, isVisible]);

  // Highlight target element
  useEffect(() => {
    if (!currentStep || !isVisible) return;

    const el = document.getElementById(currentStep.targetId);
    if (el) {
      el.classList.add('ring-2', 'ring-[#0B2C6B]', 'ring-offset-2', 'rounded-lg', 'relative', 'z-50');
      return () => {
        el.classList.remove('ring-2', 'ring-[#0B2C6B]', 'ring-offset-2', 'rounded-lg', 'relative', 'z-50');
      };
    }
  }, [currentStep, isVisible]);

  if (!currentStep || !isVisible || !pos) return null;

  const stepNumber = completedSteps.length + 1;

  const arrowStyles = {
    top: 'left-1/2 -translate-x-1/2 -top-2 border-l-8 border-r-8 border-b-8 border-b-white border-l-transparent border-r-transparent',
    bottom: 'left-1/2 -translate-x-1/2 -bottom-2 border-l-8 border-r-8 border-t-8 border-t-white border-l-transparent border-r-transparent',
    left: 'top-1/2 -translate-y-1/2 -left-2 border-t-8 border-b-8 border-r-8 border-r-white border-t-transparent border-b-transparent',
    right: 'top-1/2 -translate-y-1/2 -right-2 border-t-8 border-b-8 border-l-8 border-l-white border-t-transparent border-b-transparent',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/20" onClick={closePopup} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[70] w-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
        style={{ top: pos.top, left: pos.left }}
      >
        {/* Arrow */}
        <div className={`absolute ${arrowStyles[pos.arrow]}`} />

        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-[#0B2C6B]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0B2C6B]">
            Step {stepNumber} of {totalSteps}
          </span>
          <button
            onClick={closePopup}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-slate-900">{currentStep.title}</h3>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{currentStep.description}</p>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={currentStep.actionHref}
            onClick={() => completeStep(currentStep.id)}
            className="flex-1 rounded-lg bg-[#0B2C6B] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#0A255A] transition-colors"
          >
            {currentStep.actionLabel}
          </Link>
          <button
            onClick={skipStep}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < completedSteps.length
                  ? 'w-4 bg-[#0B2C6B]'
                  : i === completedSteps.length
                  ? 'w-4 bg-[#0B2C6B]/40'
                  : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
