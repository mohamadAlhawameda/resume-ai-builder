'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import clsx from 'clsx';
import { useLocale } from '@/i18n/LocaleProvider';
import { applyTheme, getCurrentTheme, type Theme } from '@/lib/theme';

export default function ThemeToggle({ className }: { className?: string }) {
  const { t } = useLocale();
  // null until mount: the blocking script in layout.tsx already set the real
  // class before paint, so we just need to read it once on the client rather
  // than guess (and risk a hydration flash) on the server.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  if (theme === null) {
    return <span className={clsx('inline-block min-w-11 min-h-11', className)} aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
      title={theme === 'dark' ? t('common.switchToLightMode') : t('common.switchToDarkMode')}
      className={clsx(
        'inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition',
        className
      )}
    >
      {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" aria-hidden /> : <Moon className="w-[18px] h-[18px]" aria-hidden />}
    </button>
  );
}
