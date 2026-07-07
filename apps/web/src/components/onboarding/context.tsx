'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: string; // SVG path
  actionLabel: string;
  actionHref: string;
};

const defaultSteps: OnboardingStep[] = [
  {
    id: 'cv',
    title: 'Upload CV Anda',
    description: 'Upload CV dan biarkan AI menganalisis keahlian Anda secara otomatis. Langkah pertama untuk memulai.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    actionLabel: 'Upload CV Sekarang',
    actionHref: '/dashboard/profile?tab=documents',
  },
  {
    id: 'profile',
    title: 'Lengkapi Profil',
    description: 'Isi data diri Anda agar kami bisa mencocokkan Anda dengan peluang yang tepat.',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    actionLabel: 'Mulai Isi Profil',
    actionHref: '/dashboard/profile',
  },
  {
    id: 'capability',
    title: 'Tes Kemampuan',
    description: 'Ikuti asesmen untuk membantu kami memahami kekuatan Anda.',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    actionLabel: 'Mulai Asesmen',
    actionHref: '/dashboard/assessments',
  },
];

type OnboardingContextType = {
  currentStep: OnboardingStep | null;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: string[];
  isCompleted: boolean;
  isVisible: boolean;
  nextStep: () => void;
  prevStep: () => void;
  completeStep: (stepId: string) => void;
  skipAll: () => void;
  reopenModal: () => void;
  completionPercent: number;
};

const STORAGE_KEY = 'binahub_onboarding_state';

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}

function loadState(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.completedSteps || [];
    }
  } catch {}
  return [];
}

function saveState(completedSteps: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedSteps, skipped: false }));
  } catch {}
}

function loadSkipped(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.skipped === true;
    }
  } catch {}
  return false;
}

function saveSkipped() {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, skipped: true }));
  } catch {}
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Load state on mount
  useEffect(() => {
    const completed = loadState();
    const wasSkipped = loadSkipped();
    setCompletedSteps(completed);
    setSkipped(wasSkipped);

    // Show modal if not completed and not skipped
    if (!wasSkipped && completed.length < defaultSteps.length) {
      // Find first incomplete step
      const firstIncomplete = defaultSteps.findIndex((s) => !completed.includes(s.id));
      if (firstIncomplete >= 0) {
        setCurrentStepIndex(firstIncomplete);
        setIsVisible(true);
      }
    }
  }, []);

  // Save state when it changes
  useEffect(() => {
    if (completedSteps.length > 0) {
      saveState(completedSteps);
    }
  }, [completedSteps]);

  // Get available steps (not completed)
  const availableSteps = defaultSteps.filter((s) => !completedSteps.includes(s.id));
  const currentStep = !skipped && availableSteps.length > 0 ? availableSteps[0] : null;
  const isCompleted = availableSteps.length === 0;
  const completionPercent = Math.round((completedSteps.length / defaultSteps.length) * 100);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, availableSteps.length - 1));
  }, [availableSteps.length]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      if (prev.includes(stepId)) return prev;
      return [...prev, stepId];
    });
    setIsVisible(true);
  }, []);

  const skipAll = useCallback(() => {
    setSkipped(true);
    setIsVisible(false);
    saveSkipped();
  }, []);

  const reopenModal = useCallback(() => {
    const completed = loadState();
    const wasSkipped = loadSkipped();
    
    if (wasSkipped) {
      // Reset skipped status
      setSkipped(false);
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, skipped: false }));
      } catch {}
    }
    
    // Find first incomplete step
    const firstIncomplete = defaultSteps.findIndex((s) => !completed.includes(s.id));
    if (firstIncomplete >= 0) {
      setCurrentStepIndex(firstIncomplete);
      setIsVisible(true);
    } else {
      // All completed, show from step 0
      setCurrentStepIndex(0);
      setIsVisible(true);
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        currentStepIndex,
        totalSteps: defaultSteps.length,
        completedSteps,
        isCompleted,
        isVisible,
        nextStep,
        prevStep,
        completeStep,
        skipAll,
        reopenModal,
        completionPercent,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
