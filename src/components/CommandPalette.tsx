'use client';

// Global ⌘K / Ctrl+K command palette (cmdk) — quick navigation plus the
// app's key actions. Rendered once in the root layout; only shows
// authenticated destinations when a session exists.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  FilePlus2,
  ScanSearch,
  Radar,
  Users,
  Sparkles,
  UserCircle2,
  UserPlus,
  BellPlus,
  Eye,
  Moon,
  Sun,
  Search,
} from 'lucide-react';
import useAuthStatus from '@/app/hooks/useAuthStatus';
import { useLocale } from '@/i18n/LocaleProvider';
import { applyTheme, getCurrentTheme } from '@/lib/theme';

export default function CommandPalette() {
  const router = useRouter();
  const { t } = useLocale();
  const isAuthenticated = useAuthStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const toggleTheme = () => {
    const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setOpen(false);
  };

  const NAV = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/jobs', labelKey: 'nav.jobs', icon: Briefcase },
    { href: '/resumes', labelKey: 'nav.myResumes', icon: FileText },
    { href: '/analyze', labelKey: 'nav.analyze', icon: ScanSearch },
    { href: '/radar', labelKey: 'nav.radar', icon: Radar },
    { href: '/network', labelKey: 'nav.network', icon: Users },
    { href: '/tools', labelKey: 'nav.aiTools', icon: Sparkles },
    { href: '/profile', labelKey: 'nav.profile', icon: UserCircle2 },
  ];

  const ACTIONS = [
    { href: '/resume', labelKey: 'commandPalette.newResume', icon: FilePlus2 },
    { href: '/analyze', labelKey: 'commandPalette.scanResume', icon: ScanSearch },
    { href: '/network', labelKey: 'commandPalette.addContact', icon: UserPlus },
    { href: '/network?tab=reminders', labelKey: 'commandPalette.addReminder', icon: BellPlus },
    { href: '/network?tab=watchlist', labelKey: 'commandPalette.watchCompany', icon: Eye },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t('commandPalette.title')}
      className="fixed inset-0 z-[120]"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />

      {/* Panel */}
      <div className="fixed inset-x-4 top-[15vh] sm:inset-x-auto sm:start-1/2 sm:-translate-x-1/2 rtl:sm:translate-x-1/2 sm:w-full sm:max-w-lg bg-surface border border-border rounded-2xl shadow-soft-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          <Command.Input
            placeholder={t('commandPalette.placeholder')}
            className="flex-1 py-3.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:block text-[10px] font-semibold text-muted-foreground border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto thin-scrollbar p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            {t('commandPalette.noResults')}
          </Command.Empty>

          {isAuthenticated && (
            <>
              <Command.Group
                heading={t('commandPalette.actions')}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
              >
                {ACTIONS.map(({ href, labelKey, icon: Icon }) => (
                  <Command.Item
                    key={labelKey}
                    onSelect={() => go(href)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    {t(labelKey)}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group
                heading={t('commandPalette.navigate')}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
              >
                {NAV.map(({ href, labelKey, icon: Icon }) => (
                  <Command.Item
                    key={href}
                    onSelect={() => go(href)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    {t(labelKey)}
                  </Command.Item>
                ))}
              </Command.Group>
            </>
          )}

          <Command.Group
            heading={t('commandPalette.preferences')}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
          >
            <Command.Item
              onSelect={toggleTheme}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground cursor-pointer data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
            >
              <Moon className="w-4 h-4 shrink-0 dark:hidden" aria-hidden />
              <Sun className="w-4 h-4 shrink-0 hidden dark:block" aria-hidden />
              {t('commandPalette.toggleTheme')}
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
