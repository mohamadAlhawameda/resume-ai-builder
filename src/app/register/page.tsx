'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function AdvancedRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState('');

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
    if (watchedPassword.length < 6) return setPasswordStrength('Too weak');
    if (/[A-Z]/.test(watchedPassword) && /[0-9]/.test(watchedPassword) && watchedPassword.length >= 8)
      return setPasswordStrength('Strong');
    setPasswordStrength('Medium');
  }, [watchedPassword]);

 const onSubmit = async (data: FormData) => {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch('https://resume-ai-builder-esnw.onrender.com/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.message || 'Registration failed');
      return;
    }

    const { token, user } = result;

    if (!token || !user) {
      setError("Invalid response from server. Please try again.");
      return;
    }

    // Store auth
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    // Check if redirected for resume saving
    const redirectUrl = new URL(window.location.href);
    const redirectAction = redirectUrl.searchParams.get("redirect");

    if (redirectAction === "saveResume") {
      const resumeDataToSave = localStorage.getItem("resumeDataToSave");

      if (resumeDataToSave) {
        try {
          const saveResponse = await fetch("https://resume-ai-builder-esnw.onrender.com/resume/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ data: JSON.parse(resumeDataToSave) }),
          });

          if (!saveResponse.ok) {
            console.error("Auto-save resume failed:", await saveResponse.text());
            alert("Account created but auto-saving resume failed.");
          } else {
            alert("Account created and resume saved!");
          }

          localStorage.removeItem("resumeDataToSave");
        } catch (err) {
          console.error("Resume auto-save error:", err);
        }
      }

      router.push("/dashboard");
      return;
    }

    // Normal flow if not resume save
    router.push("/resume");

  } catch (err) {
    console.error("Registration error:", err);
    setError("Unexpected server error, please try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-100 via-sky-100 to-emerald-100 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-lg bg-white p-10 rounded-2xl shadow-2xl border"
        noValidate
      >
        <h1 className="text-3xl font-extrabold text-center text-indigo-600 mb-8">Create an Account</h1>

        {[
          { id: 'name', label: 'Full Name', type: 'text' },
          { id: 'email', label: 'Email Address', type: 'email' },
        ].map(({ id, label, type }) => (
          <div key={id} className="mb-4">
            <label htmlFor={id} className="block font-medium text-gray-700 mb-1">
              {label}
            </label>
            <input
              id={id}
              type={type}
              {...register(id as keyof FormData)}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm ${
                errors[id as keyof FormData]
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
              aria-invalid={errors[id as keyof FormData] ? 'true' : 'false'}
              aria-describedby={`${id}-error`}
            />
            {errors[id as keyof FormData] && (
              <p id={`${id}-error`} className="text-red-600 text-xs mt-1">
                {errors[id as keyof FormData]?.message}
              </p>
            )}
          </div>
        ))}

        {/* Password field */}
        <div className="mb-4 relative">
          <label htmlFor="password" className="block font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm ${
              errors.password ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
            }`}
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby="password-error password-strength"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-8 right-3 text-gray-500 hover:text-indigo-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {errors.password && (
            <p id="password-error" className="text-red-600 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
          {passwordStrength && (
            <p
              id="password-strength"
              className={`text-xs mt-1 font-medium ${
                passwordStrength === 'Strong'
                  ? 'text-green-600'
                  : passwordStrength === 'Medium'
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              Password strength: {passwordStrength}
            </p>
          )}
        </div>

        {/* Confirm Password field */}
        <div className="mb-6 relative">
          <label htmlFor="confirmPassword" className="block font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
            className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm ${
              errors.confirmPassword ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
            }`}
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-describedby="confirmPassword-error"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute top-8 right-3 text-gray-500 hover:text-indigo-600"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-red-600 text-xs mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          ) : (
            'Register'
          )}
        </button>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-indigo-600 font-medium hover:underline">
            Log in here
          </a>
        </p>
      </form>
    </main>
  );
}
