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
    'bg-gradient-to-b from-primary to-primary-hover text-primary-foreground hover:brightness-110 active:brightness-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px active:translate-y-0 focus-visible:ring-primary',
  secondary:
    'bg-foreground text-background hover:opacity-90 shadow-md shadow-foreground/15 hover:-translate-y-px active:translate-y-0 focus-visible:ring-border-strong',
  outline:
    'border border-border-strong bg-surface text-foreground hover:bg-primary/5 hover:border-primary/50 hover:text-primary focus-visible:ring-primary',
  ghost: 'text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:ring-border-strong',
  danger:
    'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/20 focus-visible:ring-danger',
  success:
    'bg-gradient-to-b from-success to-success-hover text-success-foreground hover:brightness-110 shadow-md shadow-success/25 hover:-translate-y-px active:translate-y-0 focus-visible:ring-success',
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
