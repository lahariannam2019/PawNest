'use client';

import { useState, useEffect } from 'react';

export function useMotionPreference() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // 1. Check local storage
    const stored = localStorage.getItem('pawnest_reduce_motion');
    if (stored !== null) {
      setReduceMotion(stored === 'true');
      return;
    }

    // 2. Fallback to OS preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleReduceMotion = () => {
    setReduceMotion((prev) => {
      const next = !prev;
      localStorage.setItem('pawnest_reduce_motion', String(next));
      document.cookie = `pn_reduce_motion=${next}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  };

  return { reduceMotion, toggleReduceMotion };
}
