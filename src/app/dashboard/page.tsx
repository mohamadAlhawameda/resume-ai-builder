'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import clsx from 'clsx';

const ACTIONS = [
  {
    key: 'create',
    label: 'Create New Resume',
    icon: '📝',
    description: 'Start building your resume from scratch.',
    href: '/resume',
    color: 'bg-indigo-600 hover:bg-indigo-700',
  },
  {
    key: 'view',
    label: 'View My Resumes',
    icon: '📄',
    description: 'Browse and manage your saved resumes.',
    href: '/resumes',
    color: 'bg-green-600 hover:bg-green-700',
  },
  {
    key: 'ai',
    label: 'AI Resume Suggestions',
    icon: '🤖',
    description: 'Get AI-powered resume tips and improvements.',
    href: '/ai-suggest',
    color: 'bg-pink-500 hover:bg-pink-600',
  },
];

// Inactivity logout timer (in ms)
const INACTIVITY_TIMEOUT = 1000 * 60 * 15; // 15 mins

export default function DashboardPage() {
  const router = useRouter();

  // User state
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dark mode state (sync with system preference + localStorage)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  // Logout modal
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Welcome typing animation (word by word + blinking cursor)
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);

  // Inactivity logout timer ref
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(INACTIVITY_TIMEOUT / 1000);

  // Actions filter/search state
  const [searchTerm, setSearchTerm] = useState('');

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Error boundary fallback
  const [hasError, setHasError] = useState(false);

  // Load user on mount
  useEffect(() => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (!token || !userData) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setNameInput(parsedUser.name || '');
      setAvatarPreview(parsedUser.avatarUrl || null);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Typing animation logic (word by word)
  useEffect(() => {
    if (!user?.name) return;
    const fullText = `Hello ${user.name}, welcome back!`;
    const words = fullText.split(' ');
    setTypedWords([]);

    let idx = 0;
    const interval = setInterval(() => {
      setTypedWords((prev) => [...prev, words[idx]]);
      idx++;
      if (idx >= words.length) clearInterval(interval);
    }, 350);

    // Cursor blink
    const cursorInterval = setInterval(() => {
      setShowCursor((v) => !v);
    }, 600);

    return () => {
      clearInterval(interval);
      clearInterval(cursorInterval);
      setShowCursor(true);
    };
  }, [user]);

  // Handle logout logic + timer
  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success('Logged out');
    setTimeout(() => router.push('/login'), 1000);
  }, [router]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    setCountdown(INACTIVITY_TIMEOUT / 1000);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);

    inactivityTimer.current = setTimeout(() => {
      setLogoutModalOpen(true);
    }, INACTIVITY_TIMEOUT);

    // Start countdown every second
    countdownInterval.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownInterval.current!);
          handleLogout();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [handleLogout]);

  // Setup inactivity timer on mount + event listeners for user activity
  useEffect(() => {
    resetInactivityTimer();

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const resetOnActivity = () => resetInactivityTimer();

    for (const event of events) {
      window.addEventListener(event, resetOnActivity);
    }
    return () => {
      for (const event of events) {
        window.removeEventListener(event, resetOnActivity);
      }
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [resetInactivityTimer]);

  // Dark mode toggle handler
  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const newMode = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', newMode.toString());
        if (newMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
      return newMode;
    });
  }, []);

  // Save name handler with simple validation
  const saveName = () => {
    if (!nameInput.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setUser((prev) => (prev ? { ...prev, name: nameInput.trim() } : prev));
    setEditingName(false);
    toast.success('Name updated');
  };

  // Avatar upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      toast.success('Avatar updated (locally)');
    };
    reader.readAsDataURL(file);
  };

  // Reset avatar preview
  const resetAvatar = () => {
    setAvatarPreview(null);
    toast.info('Avatar reset to default');
  };

  // Filter actions by search term
  const filteredActions = ACTIONS.filter(({ label }) =>
    label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keyboard shortcuts for logout (L) and dark mode toggle (D)
  useEffect(() => {
    const keyListener = (e: KeyboardEvent) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key.toLowerCase() === 'l') setLogoutModalOpen(true);
      if (e.key.toLowerCase() === 'd') toggleDarkMode();
    };
    window.addEventListener('keydown', keyListener);
    return () => window.removeEventListener('keydown', keyListener);
  }, [toggleDarkMode]);

  // Error boundary fallback simulation (you can replace with actual boundary)
  if (hasError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900">
        <div className="bg-white dark:bg-red-800 rounded p-10 shadow-lg max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-700 dark:text-red-400">Something went wrong</h1>
          <p className="mb-6 text-red-600 dark:text-red-300">
            An unexpected error occurred. Please refresh the page or try again later.
          </p>
          <button
            onClick={() => setHasError(false)}
            className="px-6 py-3 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
        <div role="status" aria-live="polite" className="text-indigo-600 text-xl font-semibold">
          Loading your dashboard...
        </div>
      </main>
    );
  }

  return (
    <div
      className={clsx(
        'min-h-screen flex flex-col md:flex-row bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors',
        darkMode ? 'dark' : ''
      )}
    >
      <ToastContainer position="top-center" autoClose={3000} theme={darkMode ? 'dark' : 'light'} />

      {/* Sidebar */}
      <nav
        className={clsx(
          'bg-white dark:bg-gray-900 shadow-lg p-6 flex flex-col justify-between transition-colors',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
        aria-label="Primary navigation"
      >
        <div>
          <h2
            className={clsx(
              'text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-10 text-center select-none truncate',
              sidebarCollapsed ? 'hidden' : 'block'
            )}
          >
            My Dashboard
          </h2>

          <ul className="space-y-4">
            {ACTIONS.map(({ key, label, icon, href }) => (
              <li key={key}>
                <button
                  onClick={() => router.push(href)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full',
                    sidebarCollapsed && 'justify-center'
                  )}
                  aria-label={label}
                  title={label}
                >
                  <span className="text-2xl">{icon}</span>
                  {!sidebarCollapsed && label}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => setLogoutModalOpen(true)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transition focus:outline-none focus:ring-2 focus:ring-red-600 w-full',
                  sidebarCollapsed && 'justify-center'
                )}
                aria-label="Logout"
                title="Logout"
              >
                <span className="text-2xl">🚪</span>
                {!sidebarCollapsed && 'Logout'}
              </button>
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-center mt-10 gap-4">
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded shadow hover:bg-indigo-700 dark:hover:bg-indigo-600 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
          >
            {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sidebarCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-10 max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-indigo-700 mb-8 text-center select-none"
        >
          Welcome to Your Dashboard
        </motion.h1>

        {user && (
          <section
            className="text-center mb-14"
            aria-live="polite"
            aria-atomic="true"
            aria-relevant="text"
          >
            <div className="inline-block bg-indigo-100 dark:bg-indigo-900 rounded-full p-6 mb-5 select-none relative">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt={`${user.name}&quot;s avatar`}
                  width={96}
                  height={96}
                  className="rounded-full object-cover"
                  draggable={false}
                  unoptimized
                />
              ) : (
                <span className="text-indigo-600 dark:text-indigo-300 text-6xl font-extrabold select-text">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}

              {/* Avatar edit overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change avatar"
                className="absolute bottom-0 right-0 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full p-2 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                type="button"
              >
                ✏️
              </button>
              {avatarPreview && (
                <button
                  onClick={resetAvatar}
                  aria-label="Reset avatar"
                  className="absolute bottom-0 left-0 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  type="button"
                >
                  ❌
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {!editingName ? (
              <div className="flex justify-center items-center gap-4">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-300 select-text whitespace-nowrap">
                  {typedWords.join(' ')}
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'inline-block w-1 h-6 bg-indigo-600 dark:bg-indigo-400 ml-1',
                      showCursor ? 'opacity-100 animate-blink' : 'opacity-0'
                    )}
                  />
                </h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 text-sm"
                  aria-label="Edit name"
                >
                  ✏️ Edit
                </button>
              </div>
            ) : (
              <div className="flex justify-center gap-4 items-center mt-3">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-2 rounded border border-gray-400 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
                  aria-label="Edit user name"
                  autoFocus
                />
                <button
                  onClick={saveName}
                  className="bg-green-500 hover:bg-green-600 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                  aria-label="Save name"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
              </div>
            )}

            <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm select-text">{user.email}</p>

            {/* User stats placeholders */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-xl mx-auto">
              <div className="bg-indigo-50 dark:bg-indigo-900 rounded-xl p-4 shadow flex flex-col items-center">
                <span className="text-indigo-600 dark:text-indigo-300 text-4xl mb-2">📂</span>
                <p className="font-semibold text-indigo-700 dark:text-indigo-400">5</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">Resumes Created</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900 rounded-xl p-4 shadow flex flex-col items-center">
                <span className="text-indigo-600 dark:text-indigo-300 text-4xl mb-2">⭐</span>
                <p className="font-semibold text-indigo-700 dark:text-indigo-400">12</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">Job Applications</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900 rounded-xl p-4 shadow flex flex-col items-center">
                <span className="text-indigo-600 dark:text-indigo-300 text-4xl mb-2">🕒</span>
                <p className="font-semibold text-indigo-700 dark:text-indigo-400">8</p>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">Interviews Scheduled</p>
              </div>
            </div>
          </section>
        )}

        {/* Actions Search */}
        <section className="max-w-xl mx-auto mb-10">
          <input
            type="search"
            placeholder="Search actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-100"
            aria-label="Search dashboard actions"
          />
        </section>

        {/* Actions List */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredActions.length === 0 && (
            <p className="text-center col-span-full text-gray-500 dark:text-gray-400">
              No actions found.
            </p>
          )}
          {filteredActions.map(({ key, label, icon, description, href, color }) => (
            <motion.button
              key={key}
              onClick={() => router.push(href)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={clsx(
                color,
                'text-white rounded-xl shadow-lg p-6 flex flex-col items-start focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition'
              )}
              aria-label={label}
              title={label}
              type="button"
            >
              <span className="text-4xl mb-3">{icon}</span>
              <h3 className="text-xl font-semibold">{label}</h3>
              <p className="mt-1 text-sm">{description}</p>
            </motion.button>
          ))}
        </section>

      {/* Logout confirmation modal */}
      <AnimatePresence>
        {logoutModalOpen && (
          <motion.div
            key="logout-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 text-center"
            >
              <h2 id="logout-modal-title" className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                You&apos;re about to be logged out due to inactivity
              </h2>
              <p className="mb-6 text-gray-700 dark:text-gray-300">
                Logging out in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setLogoutModalOpen(false);
                    resetInactivityTimer();
                  }}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                >
                  Stay Logged In
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                >
                  Logout Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>
    </div>
  );
}
