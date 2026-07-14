'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Menu,
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const isAuthenticated = useAuthStatus();
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsClient(true), []);

  // Close menus when navigating
  useEffect(() => {
    setIsOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setToolsOpen(false);
  }, [pathname]);

  // Click-outside to close dropdowns
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-100'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    );

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 hover:opacity-80 transition shrink-0"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30">
            <FileText className="w-4.5 h-4.5" aria-hidden />
          </span>
          <span>
            {APP_NAME_PRIMARY}
            {APP_NAME_ACCENT && <span className="text-blue-600"> {APP_NAME_ACCENT}</span>}
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
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => setToolsOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={toolsOpen}
                className={navLinkClass(toolsActive)}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" aria-hidden />
                {t('nav.tools')}
                <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', toolsOpen && 'rotate-180')} aria-hidden />
              </button>
              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2"
                    role="menu"
                  >
                    {TOOLS_LINKS.map(({ href, labelKey, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        aria-current={isActive(href) ? 'page' : undefined}
                        className={clsx(
                          'flex items-center gap-2.5 px-4 py-2 text-sm transition',
                          isActive(href) ? 'text-blue-700 bg-blue-50/60' : 'text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden />
                        {t(labelKey)}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        )}

        <div className="flex items-center gap-2 shrink-0 ms-auto">
          {/* Primary create-action — a distinct CTA rather than a plain nav
              pill, so it reads as "the thing you do here," not just another link. */}
          {authed && (
            <Link
              href="/resume"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-sm shadow-blue-600/25 transition"
            >
              <FilePlus2 className="w-4 h-4" aria-hidden />
              {t('nav.newResume')}
            </Link>
          )}

          {authed ? (
            <>
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    if (!notifOpen) loadNotifications();
                  }}
                  aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
                  className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  <Bell className="w-5 h-5" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-sm font-semibold text-slate-900">{t('nav.notifications')}</span>
                        {unread > 0 && (
                          <button onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:underline">
                            {t('nav.markAllRead')}
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto thin-scrollbar">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm text-slate-500">
                            {t('nav.noNotifications')}
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              className={clsx(
                                'px-4 py-3 border-b border-slate-50 last:border-0',
                                !n.read && 'bg-blue-50/50'
                              )}
                            >
                              <p className="text-sm font-medium text-slate-900">{n.title}</p>
                              {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                              <p className="text-[11px] text-slate-400 mt-1">
                                {new Date(n.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.some((n) => n.type === 'job-match') && (
                        <Link
                          href="/jobs"
                          className="block px-4 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition"
                        >
                          {t('nav.viewJobMatches')}
                        </Link>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User menu (desktop) — Career Profile lives here, next to
                  Logout, rather than as a 4th top-level nav pill. */}
              <div className="relative hidden md:block" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm shadow-blue-600/30">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2"
                      role="menu"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        role="menuitem"
                        aria-current={isActive('/profile') ? 'page' : undefined}
                        className={clsx(
                          'flex items-center gap-2 px-4 py-2 text-sm transition',
                          isActive('/profile') ? 'text-blue-700 bg-blue-50/60' : 'text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <UserCircle2 className="w-4 h-4" aria-hidden /> {t('nav.profile')}
                      </Link>
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut className="w-4 h-4" aria-hidden /> {t('nav.logout')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            isClient && (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className={clsx(
                    'text-sm font-medium px-4 py-2 rounded-lg transition',
                    isActive('/login') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-4 py-2 bg-gradient-to-b from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-blue-600 shadow-sm shadow-blue-600/25 transition"
                >
                  {t('nav.getStarted')}
                </Link>
              </div>
            )
          )}

          <LanguageSwitcher className="hidden md:block" />

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-white border-t border-slate-100 overflow-hidden"
            aria-label="Mobile"
          >
            <div className="px-4 py-3 space-y-1">
              {authed && (
                <Link
                  href="/resume"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 mb-2 rounded-xl text-sm font-semibold bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-600/25 transition"
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                      isActive(href)
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-100'
                        : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="w-5 h-5" aria-hidden />
                    {t(labelKey)}
                  </Link>
                ))}

              {authed && (
                <>
                  <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('nav.tools')}</p>
                  {TOOLS_LINKS.map(({ href, labelKey, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive(href) ? 'page' : undefined}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                        isActive(href)
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-100'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <Icon className="w-5 h-5" aria-hidden />
                      {t(labelKey)}
                    </Link>
                  ))}
                </>
              )}

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <LanguageSwitcher />
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100">
                {authed ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive('/profile') ? 'page' : undefined}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                        isActive('/profile')
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-100'
                          : 'text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <UserCircle2 className="w-5 h-5" aria-hidden /> {t('nav.profile')}
                    </Link>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-5 h-5" aria-hidden /> {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="text-center text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="text-center text-sm px-4 py-2.5 bg-gradient-to-b from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-600 shadow-sm shadow-blue-600/25 transition"
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
