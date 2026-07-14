'use client';

import { Globe, Check } from 'lucide-react';
import { useLocale, LOCALES, type Locale } from '@/i18n/LocaleProvider';
import { Menu, MenuButton, MenuItems, MenuItem } from '@/components/ui/Menu';

/** Switching languages never navigates or reloads — it's a pure context
 * update, so whatever the user was doing (a half-filled form, a builder
 * draft) is untouched. */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <Menu className={className}>
      <MenuButton
        aria-label={t('language.changeLanguage')}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition min-h-11"
      >
        <Globe className="w-4 h-4 shrink-0" aria-hidden />
        <span>{t(`language.${locale}`)}</span>
      </MenuButton>
      <MenuItems align="end" width="w-40">
        {LOCALES.map((l: Locale) => (
          <MenuItem key={l} onClick={() => setLocale(l)} className="justify-between">
            {t(`language.${l}`)}
            {l === locale && <Check className="w-3.5 h-3.5 text-primary" aria-hidden />}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
