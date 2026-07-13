'use client';

import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-px active:translate-y-0 focus-visible:ring-blue-500',
  secondary:
    'bg-gradient-to-b from-slate-800 to-slate-900 text-white hover:from-slate-700 hover:to-slate-800 shadow-md shadow-slate-900/20 hover:-translate-y-px active:translate-y-0 focus-visible:ring-slate-500',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-blue-50/60 hover:border-blue-300 hover:text-blue-700 focus-visible:ring-blue-500',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  danger:
    'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus-visible:ring-red-500',
  success:
    'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white hover:from-emerald-500 hover:to-emerald-600 shadow-md shadow-emerald-600/25 hover:-translate-y-px active:translate-y-0 focus-visible:ring-emerald-500',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2 rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
