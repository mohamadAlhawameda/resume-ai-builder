// Dark/light mode: a plain class-based toggle on <html>, persisted to
// localStorage, defaulting to the OS preference. Deliberately not a React
// context — only the toggle button needs to read/write it, and the
// blocking script in layout.tsx (see THEME_INIT_SCRIPT) already applies the
// class before first paint, so there is nothing to "provide" at mount time.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Reads the class the blocking script already applied — avoids a second,
// possibly-different computation that could momentarily disagree with it.
export function getCurrentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing / storage disabled — theme just won't persist.
  }
}

// Inlined verbatim into a <script> tag in the root layout so it runs
// synchronously before the body paints (no React, no hydration wait).
// Keep this self-contained — it runs outside the bundle.
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
