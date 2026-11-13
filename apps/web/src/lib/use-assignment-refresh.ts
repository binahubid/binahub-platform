'use client';

import { useEffect } from 'react';

export function useAssignmentRefresh(nextTransition: string | null | undefined, refresh: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lastRefresh = Date.now();
    const onFocus = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 1000) return;
      lastRefresh = Date.now();
      refresh();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    const delay = nextTransition ? Date.parse(nextTransition) - Date.now() : Infinity;
    const timer = Number.isFinite(delay) && delay < 2_147_000_000
      ? window.setTimeout(refresh, Math.max(1000, delay + 250))
      : undefined;
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      window.clearTimeout(timer);
    };
  }, [enabled, nextTransition, refresh]);
}
