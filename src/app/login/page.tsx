'use client';

import { Suspense, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GoogleSignInButton, { type GoogleAuthResult } from '@/components/GoogleSignInButton';
import { api, apiErrorMessage } from '@/lib/api';
import { storeSession, type StoredUser } from '@/lib/auth';
import { useLocale } from '@/i18n/LocaleProvider';

type FormData = z.infer<ReturnType<typeof makeSchema>>;

function makeSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t('auth.emailInvalid')),
    password: z.string().min(1, t('auth.passwordRequired')),
    rememberMe: z.boolean().optional(),
  });
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => makeSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: zodResolver(schema),
  });

  // Shared post-auth flow for password and Google logins.
  const completeLogin = async (result: { token: string; user: StoredUser }, remember: boolean) => {
    storeSession(result.token, result.user, remember);

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
  };

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

      await completeLogin(result, !!data.rememberMe);
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = (result: GoogleAuthResult) => {
    completeLogin(result, true);
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -start-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -end-24 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit(onSubmit)}
        className="relative w-full max-w-md bg-surface/95 backdrop-blur-sm shadow-[0_30px_80px_-20px_rgba(37,99,235,0.25)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-foreground/5 p-6 sm:p-10 rounded-3xl border border-border"
        noValidate
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-foreground">{t('auth.loginTitle')}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{t('auth.loginSubtitle')}</p>

        <div className="mb-5">
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
            {t('auth.email')}
          </label>
          <input
            type="email"
            id="email"
            autoComplete="email"
            {...register('email')}
            className={`w-full px-4 py-3 min-h-11 border rounded-xl text-sm bg-surface text-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.email ? 'border-danger focus:ring-danger' : 'border-border-strong focus:ring-primary'
            }`}
            aria-invalid={errors.email ? 'true' : 'false'}
          />
          {errors.email && <p className="text-danger text-xs mt-1.5 font-medium">{errors.email.message}</p>}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              {...register('password')}
              className={`w-full px-4 py-3 min-h-11 pe-11 border rounded-xl text-sm bg-surface text-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
                errors.password ? 'border-danger focus:ring-danger' : 'border-border-strong focus:ring-primary'
              }`}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            <button
              type="button"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-danger text-xs mt-1.5 font-medium">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="w-4 h-4 rounded text-primary border-border-strong focus:ring-primary me-2"
            />
            {t('auth.rememberMe')}
          </label>
        </div>

        {error && (
          <div role="alert" className="text-danger text-sm text-center font-medium mb-4 bg-danger/10 border border-danger/20 rounded-xl px-3 py-2.5">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading} disabled={!isValid} icon={<LogIn className="w-4 h-4" />}>
          {loading ? t('auth.loginButtonLoading') : t('auth.loginButton')}
        </Button>

        <GoogleSignInButton onSuccess={onGoogleSuccess} />

        <p className="mt-6 text-center text-muted-foreground text-sm">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            {t('auth.registerHere')}
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
