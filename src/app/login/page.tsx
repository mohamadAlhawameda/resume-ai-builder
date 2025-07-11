'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
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
      const response = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message || "Login failed. Please check your credentials.");
        return;
      }

      const token = result?.token;
      const user = result?.user;

      if (!token || !user) {
        setError("Invalid response from server. Please try again later.");
        return;
      }

      if (data.rememberMe) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user", JSON.stringify(user));
      }

      router.push("/resume");
    } catch (err) {
      console.error("Login error:", err);
      setError("Unexpected server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-200 via-indigo-200 to-blue-200 px-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md bg-white shadow-xl p-10 rounded-3xl border border-indigo-100 animate-fade-in"
        noValidate
      >
        <h2 className="text-4xl font-bold text-center mb-6 text-indigo-800 drop-shadow">Welcome Back</h2>

        <div className="relative mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            autoComplete="email"
            {...register('email')}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm ${
              errors.email ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
            }`}
            aria-invalid={errors.email ? 'true' : 'false'}
          />
          {errors.email && <p className="text-red-600 text-sm mt-1 font-medium">{errors.email.message}</p>}
        </div>

        <div className="relative mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              {...register('password')}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm ${
                errors.password ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-500'
              }`}
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-500 hover:text-indigo-700"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-red-600 text-sm mt-1 font-medium">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center text-sm text-gray-700">
            <input
              type="checkbox"
              {...register('rememberMe')}
              className="form-checkbox text-indigo-600 rounded mr-2"
            />
            Remember me
          </label>
          <a href="#" className="text-sm text-indigo-600 hover:underline">
            Forgot Password?
          </a>
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center font-semibold mb-4">{error}</div>
        )}

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex justify-center items-center space-x-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                ></path>
              </svg>
              <span>Logging in...</span>
            </div>
          ) : (
            'Log In'
          )}
        </button>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-indigo-600 font-semibold hover:underline">
            Register here
          </a>
        </p>
      </form>
    </main>
  );
}