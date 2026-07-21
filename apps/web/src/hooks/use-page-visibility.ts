'use client';

import { useEffect, useState } from 'react';

/**
 * Mendeteksi apakah tab/halaman saat ini sedang aktif dilihat user
 * (berdasarkan document.visibilityState). Dipakai untuk menjeda
 * polling di tab yang dibiarkan terbuka di background, supaya
 * tidak terus menembak request ke server tanpa henti.
 *
 * Juga mengembalikan `justBecameVisible` (timestamp) setiap kali
 * tab berpindah dari tersembunyi -> terlihat, supaya pemanggil bisa
 * langsung fetch ulang data yang mungkin sudah basi selama tab
 * di-background-kan, alih-alih menunggu interval polling berikutnya.
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState<boolean>(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );
  const [justBecameVisible, setJustBecameVisible] = useState<number>(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      if (visible) {
        setJustBecameVisible(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return { isVisible, justBecameVisible };
}
