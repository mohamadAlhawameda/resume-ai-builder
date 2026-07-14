'use client';

import { useEffect, useState } from 'react';

/** SSR-safe media query hook: returns `false` on the server and on first
 * client render (before the effect runs), then updates to the real value —
 * matches Next.js's hydration model without a layout flash for anything
 * that degrades gracefully when initially false (e.g. "show the desktop
 * nav" defaulting to hidden-until-known is fine; the reverse would flash). */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Mirrors the Tailwind v4 default breakpoints used throughout this app.
export const BREAKPOINTS = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;
