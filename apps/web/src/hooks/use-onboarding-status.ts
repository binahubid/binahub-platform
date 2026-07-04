'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

type OnboardingStatus = {
  hasProfile: boolean;
  loading: boolean;
};

export function useOnboardingStatus(): OnboardingStatus {
  const { user, accessToken } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>({ hasProfile: false, loading: true });

  useEffect(() => {
    if (!user || !accessToken) {
      setStatus({ hasProfile: false, loading: false });
      return;
    }

    const checkStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/associate/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          // Check if profile has essential data
          const hasProfile = !!(data?.profile?.full_name || data?.full_name);
          setStatus({ hasProfile, loading: false });
        } else {
          setStatus({ hasProfile: false, loading: false });
        }
      } catch {
        setStatus({ hasProfile: false, loading: false });
      }
    };

    checkStatus();
  }, [user, accessToken]);

  return status;
}
