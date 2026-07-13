'use client';

// Lightweight i18n: a locale context backed by JSON dictionaries, instead of
// route-based locales (`/en/...`, `/ar/...`). That avoids restructuring every
// existing route under a `[locale]` segment — a large, high-risk migration —
// while still giving proper i18n keys, RTL, locale-aware formatting, and a
// language switch that never loses the user's place or session.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './messages/en.json';
import ar from './messages/ar.json';
import fr from './messages/fr.json';

export type Locale = 'en' | 'ar' | 'fr';
export const LOCALES: Locale[] = ['en', 'ar', 'fr'];
export const RTL_LOCALES: Locale[] = ['ar'];

const MESSAGES: Record<Locale, Record<string, unknown>> = { en, ar, fr };

// BCP-47 tags for Intl formatting — fr-CA/en-US reflect the US+Canada job
// market this platform targets.
const INTL_TAG: Record<Locale, string> = { en: 'en-US', ar: 'ar', fr: 'fr-CA' };

function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

interface LocaleContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  formatDate: (date: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'locale';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && LOCALES.includes(stored as Locale)) return stored as Locale;
  const browserLang = window.navigator.language?.slice(0, 2);
  if (browserLang && LOCALES.includes(browserLang as Locale)) return browserLang as Locale;
  return 'en';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // Read the persisted/browser locale only after mount (avoids SSR/client
  // markup mismatch) — the app renders in English until this resolves, which
  // is instant in practice.
  useEffect(() => {
    setLocaleState(detectInitialLocale());
  }, []);

  const dir: 'ltr' | 'rtl' = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.classList.toggle('font-arabic', locale === 'ar');
  }, [locale, dir]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value = resolvePath(MESSAGES[locale], key) ?? resolvePath(MESSAGES.en, key);
      let str = typeof value === 'string' ? value : key;
      if (params) {
        for (const [k, v] of Object.entries(params)) str = str.replace(`{${k}}`, String(v));
      }
      return str;
    },
    [locale]
  );

  const tArray = useCallback(
    (key: string): string[] => {
      const value = resolvePath(MESSAGES[locale], key) ?? resolvePath(MESSAGES.en, key);
      return Array.isArray(value) ? (value as string[]) : [];
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | string, opts?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat(INTL_TAG[locale], opts || { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(INTL_TAG[locale], opts).format(n),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, dir, setLocale, t, tArray, formatDate, formatNumber }),
    [locale, dir, setLocale, t, tArray, formatDate, formatNumber]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
