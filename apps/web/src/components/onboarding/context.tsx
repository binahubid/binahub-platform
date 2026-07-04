'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  targetId: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right';
  required?: boolean;
};

const defaultSteps: OnboardingStep[] = [
  {
    id: 'profile',
    title: "Let's complete your profile",
    description: 'Your profile helps us match you with the right opportunities.',
    actionLabel: 'Go to Profile',
    actionHref: '/dashboard/profile',
    targetId: 'sidebar-profile',
    position: 'right',
  },
  {
    id: 'cv',
    title: 'Upload your CV',
    description: 'Upload your CV and let AI do the work for you.',
    actionLabel: 'Upload CV Now',
    actionHref: '/dashboard/profile?tab=documents',
    targetId: 'upload-cv-area',
    position: 'left',
  },
  {
    id: 'capability',
    title: 'Discover your capability',
    description: 'Take assessments to help us analyze your strengths.',
    actionLabel: 'Take Assessment',
    actionHref: '/dashboard/assessments',
    targetId: 'sidebar-capability',
    position: 'right',
  },
  {
    id: 'complete-profile',
    title: 'Complete your profile',
    description: 'Complete all steps to unlock more opportunities.',
    actionLabel: 'Continue',
    actionHref: '/dashboard/profile',
    targetId: 'profile-strength',
    position: 'left',
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
  skipStep: () => void;
  closePopup: () => void;
  reopenPopup: () => void;
  disableOnboarding: () => void;
  isDisabled: boolean;
  reminderTimeLeft: number;
};

const REMINDER_INTERVAL = 120; // 2 minutes in seconds
const STORAGE_KEY = 'binahub_onboarding_state';
const DISABLE_KEY = 'binahub_onboarding_disabled';

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}

function loadState(): { completedSteps: string[]; currentIndex: number } {
  if (typeof window === 'undefined') return { completedSteps: [], currentIndex: 0 };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { completedSteps: [], currentIndex: 0 };
}

function saveState(completedSteps: string[], currentIndex: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedSteps, currentIndex }));
  } catch {}
}

function isDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DISABLE_KEY) === 'true';
}

function setDisabled(val: boolean) {
  if (typeof window === 'undefined') return;
  if (val) {
    localStorage.setItem(DISABLE_KEY, 'true');
  } else {
    localStorage.removeItem(DISABLE_KEY);
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [disabled, setDisabledState] = useState(false);
  const [reminderTimeLeft, setReminderTimeLeft] = useState(REMINDER_INTERVAL);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reminderRef = useRef<NodeJS.Timeout | null>(null);

  // Load state on mount
  useEffect(() => {
    const state = loadState();
    setCompletedSteps(state.completedSteps);
    setCurrentStepIndex(state.currentIndex);
    setDisabledState(isDisabled());
  }, []);

  // Save state when it changes
  useEffect(() => {
    saveState(completedSteps, currentStepIndex);
  }, [completedSteps, currentStepIndex]);

  // Get available steps (not completed)
  const availableSteps = defaultSteps.filter((s) => !completedSteps.includes(s.id));
  const currentStep = !disabled && availableSteps.length > 0 ? availableSteps[Math.min(currentStepIndex, availableSteps.length - 1)] : null;
  const isCompleted = availableSteps.length === 0;

  // Reminder timer - shows popup every 2 minutes if dismissed
  useEffect(() => {
    if (disabled || isCompleted || !user) return;

    const startReminder = () => {
      setReminderTimeLeft(REMINDER_INTERVAL);
      if (reminderRef.current) clearInterval(reminderRef.current);

      reminderRef.current = setInterval(() => {
        setReminderTimeLeft((prev) => {
          if (prev <= 1) {
            setIsVisible(true);
            return REMINDER_INTERVAL;
          }
          return prev - 1;
        });
      }, 1000);
    };

    startReminder();

    return () => {
      if (reminderRef.current) clearInterval(reminderRef.current);
    };
  }, [disabled, isCompleted, user, completedSteps]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, availableSteps.length - 1));
    setIsVisible(true);
  }, [availableSteps.length]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    setIsVisible(true);
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      if (prev.includes(stepId)) return prev;
      return [...prev, stepId];
    });
    setIsVisible(true);
  }, []);

  const skipStep = useCallback(() => {
    setIsVisible(false);
    setReminderTimeLeft(REMINDER_INTERVAL);
  }, []);

  const closePopup = useCallback(() => {
    setIsVisible(false);
    setReminderTimeLeft(REMINDER_INTERVAL);
  }, []);

  const reopenPopup = useCallback(() => {
    setIsVisible(true);
  }, []);

  const disableOnboarding = useCallback(() => {
    setDisabledState(true);
    setIsVisible(false);
    setDisabled(true);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        currentStepIndex: defaultSteps.findIndex((s) => s.id === currentStep?.id),
        totalSteps: defaultSteps.length,
        completedSteps,
        isCompleted,
        isVisible,
        nextStep,
        prevStep,
        completeStep,
        skipStep,
        closePopup,
        reopenPopup,
        disableOnboarding,
        isDisabled: disabled,
        reminderTimeLeft,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
