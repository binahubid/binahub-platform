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

const storageKey = (userId: string) => `binahub_onboarding_state:${userId}`;

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}

function loadSkipped(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(storageKey(userId));
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.skipped === true;
    }
  } catch {}
  return false;
}

function saveSkipped(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem(storageKey(userId));
    const parsed = saved ? JSON.parse(saved) : {};
    localStorage.setItem(storageKey(userId), JSON.stringify({ ...parsed, skipped: true }));
  } catch {}
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Server profile is authoritative. Local storage only remembers a dismissal for
  // this particular account; it must never invent a 0% profile for an old user.
  useEffect(() => {
    if (!user?.id || !accessToken) return;
    let active = true;
    setIsVisible(false);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    void fetch(`${apiUrl}/api/associate/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active || !result?.success || !result.data) return;
        const associate = result.data as { status?: string; created_at?: string; documents?: Array<{ type?: string }>; profile?: { full_name?: string; roles?: string[]; expertises?: string[] } | Array<{ full_name?: string; roles?: string[]; expertises?: string[] }> };
        const profile = Array.isArray(associate.profile) ? associate.profile[0] : associate.profile;
        const hasCv = associate.documents?.some((document) => document.type === 'cv') === true;
        const hasProfile = Boolean(profile?.full_name && (profile.roles?.length || profile.expertises?.length));
        const completed = associate.status === 'active' || associate.status === 'pending_review'
          ? ['cv', 'profile']
          : [...(hasCv ? ['cv'] : []), ...(hasProfile ? ['profile'] : [])];
        setCompletedSteps(completed);
        const wasSkipped = loadSkipped(user.id);
        setSkipped(wasSkipped);
        const accountAge = Date.now() - new Date(associate.created_at || 0).getTime();
        const isNewAccount = Number.isFinite(accountAge) && accountAge >= 0 && accountAge < 7 * 24 * 60 * 60_000;
        if (associate.status === 'draft' && isNewAccount && !wasSkipped && completed.length < defaultSteps.length) {
          setCurrentStepIndex(defaultSteps.findIndex((step) => !completed.includes(step.id)));
          setIsVisible(true);
        }
      })
      .catch(() => { /* Never show onboarding when profile status cannot be verified. */ });
    return () => { active = false; };
  }, [user?.id, accessToken]);

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
    setIsVisible(false);
  }, []);

  const skipAll = useCallback(() => {
    setSkipped(true);
    setIsVisible(false);
    if (user?.id) saveSkipped(user.id);
  }, [user?.id]);

  const reopenModal = useCallback(() => {
    if (!user?.id) return;
    const completed = completedSteps;
    const wasSkipped = loadSkipped(user.id);
    
    if (wasSkipped) {
      // Reset skipped status
      setSkipped(false);
      try {
        const saved = localStorage.getItem(storageKey(user.id));
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(storageKey(user.id), JSON.stringify({ ...parsed, skipped: false }));
      } catch {}
    }
    
    // Find first incomplete step
    const firstIncomplete = defaultSteps.findIndex((s) => !completed.includes(s.id));
    if (firstIncomplete >= 0) {
      setCurrentStepIndex(firstIncomplete);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [user?.id, completedSteps]);

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
