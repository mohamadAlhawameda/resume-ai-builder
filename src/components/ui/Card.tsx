import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  hover?: boolean;
}

export default function Card({ padded = true, hover = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_-4px_rgba(15,23,42,0.06)]',
        padded && 'p-5 sm:p-6',
        hover &&
          'transition-all duration-300 hover:shadow-[0_2px_6px_rgba(15,23,42,0.04),0_16px_32px_-10px_rgba(15,23,42,0.14)] hover:border-slate-300 hover:-translate-y-0.5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
