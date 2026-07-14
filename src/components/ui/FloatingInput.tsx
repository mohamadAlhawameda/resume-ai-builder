'use client';

import React, { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  helperText?: string;
  error?: boolean;
}

const FloatingInput: React.FC<Props> = ({
  id,
  label,
  value,
  onChange,
  className = '',
  helperText,
  error = false,
  ...rest
}) => {
  return (
    <div className={clsx('relative w-full', className)}>
      <input
        id={id}
        value={value}
        onChange={onChange}
        {...rest}
        aria-describedby={helperText ? `${id}-helper-text` : undefined}
        aria-invalid={error}
        className={clsx(
          'peer h-12 w-full border rounded-md px-3 pt-5 pb-2 text-sm bg-surface text-foreground placeholder-transparent focus:outline-none',
          error ? 'border-danger focus:ring-2 focus:ring-danger/40' : 'border-border-strong focus:ring-2 focus:ring-primary',
          rest.disabled && 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
        placeholder={label}
      />

      <label
        htmlFor={id}
        className={clsx(
          'absolute start-3 top-2 text-xs text-muted-foreground transition-all',
          'peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground',
          'peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary'
        )}
      >
        {label}
      </label>

      {helperText && (
        <p id={`${id}-helper-text`} className={clsx('mt-1 text-xs', error ? 'text-danger' : 'text-muted-foreground')}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default FloatingInput;
