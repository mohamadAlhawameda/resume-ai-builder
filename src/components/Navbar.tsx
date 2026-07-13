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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import useAuthStatus from '@/app/hooks/useAuthStatus';
import { getUser, clearSession } from '@/lib/auth';
import { api } from '@/lib/api';
import { APP_NAME_PRIMARY, APP_NAME_ACCENT } from '@/lib/config';
import type { AppNotification } from '@/lib/types';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, auth: true },
  { href: '/resume', label: 'Builder', icon: FilePlus2, auth: false },
  { href: '/resumes', label: 'My Resumes', icon: FileText, auth: true },
  { href: '/analyze', label: 'Analyze', icon: ScanSearch, auth: true },
  { href: '/jobs', label: 'Jobs', icon: Briefcase, auth: true },
  { href: '/tools', label: 'AI Tools', icon: Sparkles, auth: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const isAuthenticated = useAuthStatus();
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsClient(true), []);

  // Close menus when navigating
  useEffect(() => {
    setIsOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  // Click-outside to close dropdowns
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
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
  const links = NAV_LINKS.filter((l) => !l.auth || (isClient && isAuthenticated));
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname?.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 hover:opacity-80 transition shrink-0"
        >
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <FileText className="w-4.5 h-4.5" aria-hidden />
          </span>
          <span>
            {APP_NAME_PRIMARY}
            {APP_NAME_ACCENT && <span className="text-blue-600"> {APP_NAME_ACCENT}</span>}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition',
                isActive(href)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <Icon className="w-4 h-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isClient && isAuthenticated ? (
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
                        <span className="text-sm font-semibold text-slate-900">Notifications</span>
                        {unread > 0 && (
                          <button onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:underline">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto thin-scrollbar">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm text-slate-500">
                            No notifications yet. Strong job matches will appear here.
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
                          View job matches
                        </Link>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User menu (desktop) */}
              <div className="relative hidden md:block" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
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
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut className="w-4 h-4" aria-hidden /> Log out
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
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition"
                >
                  Get started
                </Link>
              </div>
            )
          )}

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
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                    isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  {label}
                </Link>
              ))}

              <div className="pt-2 mt-2 border-t border-slate-100">
                {isClient && isAuthenticated ? (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-5 h-5" aria-hidden /> Log out
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="text-center text-sm font-medium px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="text-center text-sm px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
                    >
                      Get started
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
