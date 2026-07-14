'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import GoogleSignInButton, { type GoogleAuthResult } from '@/components/GoogleSignInButton';
import { api, apiErrorMessage } from '@/lib/api';
import { storeSession, type StoredUser } from '@/lib/auth';
import { useLocale } from '@/i18n/LocaleProvider';

type FormData = z.infer<ReturnType<typeof makeSchema>>;

function makeSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(2, t('auth.nameTooShort')),
      email: z.string().email(t('auth.emailInvalid')),
      password: z.string().min(6, t('auth.passwordTooShort')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.passwordsNoMatch'),
      path: ['confirmPassword'],
    });
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState('');

  const schema = useMemo(() => makeSchema(t), [t]);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onChange',
    resolver: zodResolver(schema),
  });

  const watchedPassword = watch('password', '');

  useEffect(() => {
    if (!watchedPassword) return setPasswordStrength('');
    if (watchedPassword.length < 6) return setPasswordStrength(t('auth.strengthWeak'));
    if (/[A-Z]/.test(watchedPassword) && /[0-9]/.test(watchedPassword) && watchedPassword.length >= 8)
      return setPasswordStrength(t('auth.strengthStrong'));
    setPasswordStrength(t('auth.strengthMedium'));
  }, [watchedPassword, t]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api<{ token: string; user: StoredUser }>('/auth/register', {
        method: 'POST',
        auth: false,
        body: { name: data.name, email: data.email, password: data.password },
      });

      if (!result?.token || !result?.user) {
        setError('Invalid response from server. Please try again.');
        return;
      }

      await completeSignup(result);
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  // Shared post-signup flow for password and Google registrations.
  const completeSignup = async (result: { token: string; user: StoredUser }) => {
    storeSession(result.token, result.user, true);

    // Guest built a resume, then registered to save it
    if (searchParams.get('redirect') === 'saveResume') {
      const resumeDataToSave = localStorage.getItem('resumeDataToSave');
      if (resumeDataToSave) {
        try {
          await api('/resume/create', {
            method: 'POST',
            body: { data: JSON.parse(resumeDataToSave) },
          });
          localStorage.removeItem('resumeDataToSave');
        } catch (err) {
          console.error('Resume auto-save error:', err);
        }
      }
      router.push('/dashboard');
      return;
    }

    router.push('/resume');
  };

  const onGoogleSuccess = (result: GoogleAuthResult) => {
    // Returning users who click Google on the register page go to their dashboard.
    if (result.isNewUser === false && searchParams.get('redirect') !== 'saveResume') {
      storeSession(result.token, result.user, true);
      router.push('/dashboard');
      return;
    }
    completeSignup(result);
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 min-h-11 rounded-xl border text-sm bg-surface text-foreground focus:outline-none focus:ring-2 transition ${
      hasError ? 'border-danger focus:ring-danger' : 'border-border-strong focus:ring-primary'
    }`;

  const strengthColor =
    passwordStrength === t('auth.strengthStrong')
      ? 'text-success'
      : passwordStrength === t('auth.strengthMedium')
      ? 'text-warning'
      : 'text-danger';

  return (
    <main className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-success/5 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -end-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -start-24 w-96 h-96 bg-success/15 rounded-full blur-3xl" />
      </div>
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit(onSubmit)}
        className="relative w-full max-w-lg bg-surface/95 backdrop-blur-sm p-6 sm:p-10 rounded-3xl shadow-[0_30px_80px_-20px_rgba(37,99,235,0.25)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-foreground/5 border border-border"
        noValidate
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">{t('auth.registerTitle')}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{t('auth.registerSubtitle')}</p>

        {(
          [
            { id: 'name', labelKey: 'auth.fullName', type: 'text', autoComplete: 'name' },
            { id: 'email', labelKey: 'auth.emailAddress', type: 'email', autoComplete: 'email' },
          ] as const
        ).map(({ id, labelKey, type, autoComplete }) => (
          <div key={id} className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
              {t(labelKey)}
            </label>
            <input
              id={id}
              type={type}
              autoComplete={autoComplete}
              {...register(id)}
              className={inputClass(!!errors[id])}
              aria-invalid={errors[id] ? 'true' : 'false'}
              aria-describedby={`${id}-error`}
            />
            {errors[id] && (
              <p id={`${id}-error`} className="text-danger text-xs mt-1.5">
                {errors[id]?.message}
              </p>
            )}
          </div>
        ))}

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
              className={`${inputClass(!!errors.password)} pe-11`}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby="password-error password-strength"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-danger text-xs mt-1.5">
              {errors.password.message}
            </p>
          )}
          {passwordStrength && (
            <p id="password-strength" className={`text-xs mt-1.5 font-medium ${strengthColor}`}>
              {t('auth.passwordStrength', { level: passwordStrength })}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
            {t('auth.confirmPassword')}
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={`${inputClass(!!errors.confirmPassword)} pe-11`}
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby="confirmPassword-error"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-danger text-xs mt-1.5">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" className="text-sm text-danger text-center mb-4 bg-danger/10 border border-danger/20 rounded-xl px-3 py-2.5">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading} disabled={!isValid} icon={<UserPlus className="w-4 h-4" />}>
          {loading ? t('auth.registerButtonLoading') : t('auth.registerButton')}
        </Button>

        <GoogleSignInButton onSuccess={onGoogleSuccess} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            {t('auth.loginHere')}
          </Link>
        </p>
      </motion.form>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
