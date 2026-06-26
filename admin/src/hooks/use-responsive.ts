'use client';

import { useEffect, useState } from 'react';
import { BREAKPOINTS } from '@/constants/app';

export interface Responsive {
  width: number;
  isMobile: boolean; // < md
  isTablet: boolean; // md..lg
  isDesktop: boolean; // >= lg
}

/**
 * Reactive viewport info for layout decisions (sidebar collapse, drawer vs rail,
 * responsive tables). SSR-safe: starts at desktop and corrects after mount.
 */
export function useResponsive(): Responsive {
  const [width, setWidth] = useState<number>(
    typeof window === 'undefined' ? BREAKPOINTS.lg : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    width,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
  };
}

/** Boolean for an arbitrary media query (e.g. reduced motion). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
