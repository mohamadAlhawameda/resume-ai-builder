'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Menu as MenuIcon,
  X,
  Bell,
  FileText,
  LayoutDashboard,
  ScanSearch,
  Briefcase,
  Sparkles,
  LogOut,
  ChevronDown,
  FilePlus2,
  Radar,
  UserCircle2,
  LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import useAuthStatus from '@/app/hooks/useAuthStatus';
import { getUser, clearSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { APP_NAME_PRIMARY, APP_NAME_ACCENT } from '@/lib/config';
import { useLocale } from '@/i18n/LocaleProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { Menu, MenuButton, MenuItems, MenuItem, MenuLink } from '@/components/ui/Menu';
import type { AppNotification } from '@/lib/types';

// Kept to 3 core sections on the top-level bar — Analyze/Radar/AI Tools live
// in the "Tools" dropdown and Career Profile lives in the account menu, so
// the bar never has to wrap or scroll regardless of translated label length.
const PRIMARY_LINKS = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/jobs', labelKey: 'nav.jobs', icon: Briefcase },
  { href: '/resumes', labelKey: 'nav.myResumes', icon: FileText },
];

const TOOLS_LINKS = [
  { href: '/analyze', labelKey: 'nav.analyze', icon: ScanSearch },
  { href: '/radar', labelKey: 'nav.radar', icon: Radar },
  { href: '/tools', labelKey: 'nav.aiTools', icon: Sparkles },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const isAuthenticated = useAuthStatus();

  useEffect(() => setIsClient(true), []);

  // Close the mobile panel when navigating
  useEffect(() => setIsOpen(false), [pathname]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api<{ items: AppNotification[]; unread: number }>('/notifications');
      setNotifications(res.items || []);
      setUnread(res.unread || 0);
    } catch {
      // Older backend without notifications — silently ignore.
    }
  }, []);

  useEffect(() => {
    if (isClient && isAuthenticated) loadNotifications();
  }, [isClient, isAuthenticated, loadNotifications]);

  const markAllRead = async () => {
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api('/notifications/read', { method: 'POST', body: {} });
    } catch {
      /* non-critical */
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  const user = isClient ? getUser() : null;
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`));
  const toolsActive = TOOLS_LINKS.some((l) => isActive(l.href));
  const authed = isClient && isAuthenticated;

  const navLinkClass = (active: boolean) =>
    clsx(
      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap shrink-0',
      active
        ? 'bg-gradient-to-r from-primary/10 to-accent/10 text-primary ring-1 ring-primary/20'
        : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
    );

  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground hover:opacity-80 transition shrink-0"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/30">
            <FileText className="w-4.5 h-4.5" aria-hidden />
          </span>
          <span>
            {APP_NAME_PRIMARY}
            {APP_NAME_ACCENT && <span className="text-primary"> {APP_NAME_ACCENT}</span>}
          </span>
        </Link>

        {/* Desktop nav — a fixed, small set of top-level items (never more
            than 4) so it always fits on one line regardless of translated
            label length; no wrap, no scroll. */}
        {authed && (
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {PRIMARY_LINKS.map(({ href, labelKey, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className={navLinkClass(isActive(href))}>
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {t(labelKey)}
              </Link>
            ))}

            {/* Tools dropdown — groups Analyze / Opportunity Radar / AI Tools */}
            <Menu key={pathname}>
              <MenuButton className={clsx('group', navLinkClass(toolsActive))}>
                <LayoutGrid className="w-4 h-4 shrink-0" aria-hidden />
                {t('nav.tools')}
                <ToolsChevron />
              </MenuButton>
              <MenuItems width="w-56">
                {TOOLS_LINKS.map(({ href, labelKey, icon: Icon }) => (
                  <MenuLink key={href} href={href} active={isActive(href)} icon={<Icon className="w-4 h-4 shrink-0" aria-hidden />}>
                    {t(labelKey)}
                  </MenuLink>
                ))}
              </MenuItems>
            </Menu>
          </nav>
        )}

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ms-auto">
          {/* Primary create-action — a distinct CTA rather than a plain nav
              pill, so it reads as "the thing you do here," not just another link. */}
          {authed && (
            <Link
              href="/resume"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-b from-primary to-primary-hover text-primary-foreground hover:brightness-110 shadow-sm shadow-primary/25 transition"
            >
              <FilePlus2 className="w-4 h-4" aria-hidden />
              {t('nav.newResume')}
            </Link>
          )}

          {authed ? (
            <>
              {/* Notifications */}
              <Menu key={`notif-${pathname}`}>
                <MenuButton
                  onClick={() => loadNotifications()}
                  aria-label={`${t('nav.notifications')}${unread > 0 ? ` (${unread})` : ''}`}
                  className="relative min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition"
                >
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-danger-foreground text-[10px] font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </MenuButton>
                <MenuItems width="w-80" className="p-0 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold text-foreground">{t('nav.notifications')}</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-primary hover:underline">
                        {t('nav.markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto thin-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('nav.noNotifications')}</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n._id} className={clsx('px-4 py-3 border-b border-border last:border-0', !n.read && 'bg-primary/5')}>
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-[11px] text-muted-foreground/80 mt-1">
                            {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.some((n) => n.type === 'job-match') && (
                    <Link
                      href="/jobs"
                      className="block px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-primary/5 border-t border-border transition"
                    >
                      {t('nav.viewJobMatches')}
                    </Link>
                  )}
                </MenuItems>
              </Menu>

              {/* User menu (desktop) — Career Profile lives here, next to
                  Logout, rather than as a 4th top-level nav pill. */}
              <Menu key={`user-${pathname}`} className="hidden md:block">
                <MenuButton className="flex items-center gap-2 ps-1.5 pe-2.5 min-h-11 rounded-full border border-border hover:border-border-strong hover:bg-surface-hover transition">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm shadow-primary/30">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden />
                </MenuButton>
                <MenuItems align="end" width="w-56">
                  <div className="px-4 py-2 border-b border-border mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <MenuLink href="/profile" active={isActive('/profile')} icon={<UserCircle2 className="w-4 h-4" aria-hidden />}>
                    {t('nav.profile')}
                  </MenuLink>
                  <MenuItem danger onClick={handleLogout} icon={<LogOut className="w-4 h-4" aria-hidden />}>
                    {t('nav.logout')}
                  </MenuItem>
                </MenuItems>
              </Menu>
            </>
          ) : (
            isClient && (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className={clsx(
                    'text-sm font-medium px-4 py-2 rounded-lg transition',
                    isActive('/login') ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  )}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-4 py-2 bg-gradient-to-b from-primary to-primary-hover text-primary-foreground font-semibold rounded-lg hover:brightness-110 shadow-sm shadow-primary/25 transition"
                >
                  {t('nav.getStarted')}
                </Link>
              </div>
            )
          )}

          <ThemeToggle />
          <LanguageSwitcher className="hidden md:block" />

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden min-w-11 min-h-11 flex items-center justify-center rounded-lg text-foreground hover:bg-surface-hover transition"
            aria-label={isOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — fades/slides in rather than animating height, and
          never clips overflow. A height animation needs `overflow-hidden`
          to look clean, but that would also clip the Language Switcher's
          dropdown (and anything else that pops open) since the container's
          height is fixed to the closed content's size — the popover would
          render but be invisible, looking like nothing happened. */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-surface border-t border-border"
            aria-label="Mobile"
          >
            <div className="px-4 py-3 space-y-1">
              {authed && (
                <Link
                  href="/resume"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 mb-2 rounded-xl text-sm font-semibold bg-gradient-to-b from-primary to-primary-hover text-primary-foreground shadow-sm shadow-primary/25 transition"
                >
                  <FilePlus2 className="w-4 h-4" aria-hidden /> {t('nav.newResume')}
                </Link>
              )}

              {authed &&
                PRIMARY_LINKS.map(({ href, labelKey, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition min-h-11',
                      isActive(href)
                        ? 'bg-gradient-to-r from-primary/10 to-accent/10 text-primary ring-1 ring-primary/20'
                        : 'text-foreground hover:bg-surface-hover'
                    )}
                  >
                    <Icon className="w-5 h-5" aria-hidden />
                    {t(labelKey)}
                  </Link>
                ))}

              {authed && (
                <>
                  <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('nav.tools')}</p>
                  {TOOLS_LINKS.map(({ href, labelKey, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive(href) ? 'page' : undefined}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition min-h-11',
                        isActive(href)
                          ? 'bg-gradient-to-r from-primary/10 to-accent/10 text-primary ring-1 ring-primary/20'
                          : 'text-foreground hover:bg-surface-hover'
                      )}
                    >
                      <Icon className="w-5 h-5" aria-hidden />
                      {t(labelKey)}
                    </Link>
                  ))}
                </>
              )}

              <div className="pt-2 mt-2 border-t border-border flex items-center justify-start gap-2">
                <LanguageSwitcher menuAlign="start" className="shrink-0" />
              </div>

              <div className="pt-2 mt-2 border-t border-border">
                {authed ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive('/profile') ? 'page' : undefined}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition min-h-11',
                        isActive('/profile')
                          ? 'bg-gradient-to-r from-primary/10 to-accent/10 text-primary ring-1 ring-primary/20'
                          : 'text-foreground hover:bg-surface-hover'
                      )}
                    >
                      <UserCircle2 className="w-5 h-5" aria-hidden /> {t('nav.profile')}
                    </Link>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 transition min-h-11"
                    >
                      <LogOut className="w-5 h-5" aria-hidden /> {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="text-center text-sm font-medium px-4 py-2.5 rounded-xl border border-border-strong text-foreground hover:bg-surface-hover transition min-h-11 flex items-center justify-center"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="text-center text-sm px-4 py-2.5 bg-gradient-to-b from-primary to-primary-hover text-primary-foreground font-semibold rounded-xl hover:brightness-110 shadow-sm shadow-primary/25 transition min-h-11 flex items-center justify-center"
                    >
                      {t('nav.getStarted')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function ToolsChevron() {
  return <ChevronDown className="w-3.5 h-3.5 transition-transform group-aria-expanded:rotate-180" aria-hidden />;
}
