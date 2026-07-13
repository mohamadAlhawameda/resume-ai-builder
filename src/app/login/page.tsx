'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { api, apiErrorMessage } from '@/lib/api';
import { storeSession, type StoredUser } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api<{ token: string; user: StoredUser }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email: data.email, password: data.password },
      });

      if (!result?.token || !result?.user) {
        setError('Invalid response from server. Please try again later.');
        return;
      }

      storeSession(result.token, result.user, !!data.rememberMe);

      const redirectAction = searchParams.get('redirect');

      // Guest built a resume, then logged in to save it
      if (redirectAction === 'saveResume') {
        const resumeDataToSave = localStorage.getItem('resumeDataToSave');
        if (resumeDataToSave) {
          try {
            await api('/resume/create', {
              method: 'POST',
              body: { data: JSON.parse(resumeDataToSave) },
            });
            localStorage.removeItem('resumeDataToSave');
          } catch (saveErr) {
            console.error('Resume save error after login:', saveErr);
          }
        }
        router.push('/dashboard');
        return;
      }

      // Path-style redirect (e.g. /login?redirect=/analyze)
      if (redirectAction && redirectAction.startsWith('/')) {
        router.push(redirectAction);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-12">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md bg-white shadow-xl shadow-blue-100/60 p-8 sm:p-10 rounded-3xl border border-slate-100"
        noValidate
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500 text-center mb-8">Log in to your resumes, scans, and job matches.</p>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            autoComplete="email"
            {...register('email')}
            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.email ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-blue-500'
            }`}
            aria-invalid={errors.email ? 'true' : 'false'}
          />
          {errors.email && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              {...register('password')}
              className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.password ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-blue-500'
              }`}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 mr-2"
            />
            Remember me
          </label>
        </div>

        {error && (
          <div role="alert" className="text-red-700 text-sm text-center font-medium mb-4 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading} disabled={!isValid} icon={<LogIn className="w-4 h-4" />}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>

        <p className="mt-6 text-center text-slate-500 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </motion.form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
