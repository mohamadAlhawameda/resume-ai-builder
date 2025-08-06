// ✅ Final cleaned + advanced dashboard design
// We’re reverting to your original professional layout but removing unused sections
// We'll keep AI suggestions, job apps, interviews, and dark mode *removed*, but retain the original structure and polish

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const actions = [
  {
    label: 'Create New Resume',
    icon: '📝',
    href: '/resume',
    color: 'bg-indigo-600 hover:bg-indigo-700',
  },
  {
    label: 'View My Resumes',
    icon: '📄',
    href: '/resumes',
    color: 'bg-green-600 hover:bg-green-700',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.dispatchEvent(new Event('authChanged'));
    toast.success('Logged out');
    setTimeout(() => router.push('/'), 1000);
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-100 to-indigo-100">
        <div className="text-indigo-600 text-xl font-semibold">Loading your dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 md:px-12 lg:px-24">
      <ToastContainer position="top-center" autoClose={3000} />

      <div className="max-w-5xl mx-auto text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-4xl font-bold">
            {user?.name?.[0]?.toUpperCase() || '👤'}
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-800">Welcome, {user?.name}</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {actions.map((action) => (
            <motion.button
              key={action.label}
              onClick={() => router.push(action.href)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`${action.color} text-white font-semibold px-6 py-6 rounded-xl shadow-md text-left transition-all`}
            >
              <div className="text-3xl mb-2">{action.icon}</div>
              <div className="text-xl">{action.label}</div>
            </motion.button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="mt-10 text-sm text-red-600 hover:underline"
        >
          Logout
        </button>
      </div>
    </main>
  );
}