'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import clsx from 'clsx';
import { useLocale, LOCALES, type Locale } from '@/i18n/LocaleProvider';

/** Switching languages never navigates or reloads — it's a pure context
 * update, so whatever the user was doing (a half-filled form, a builder
 * draft) is untouched. */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className={clsx('relative', className)} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change language"
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
      >
        <Globe className="w-4 h-4 shrink-0" aria-hidden />
        <span>{t(`language.${locale}`)}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-40 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50"
        >
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              role="menuitem"
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-start text-slate-700 hover:bg-slate-50 transition"
            >
              {t(`language.${l}`)}
              {l === locale && <Check className="w-3.5 h-3.5 text-blue-600" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
