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
        'bg-surface rounded-2xl border border-border shadow-soft',
        padded && 'p-5 sm:p-6',
        hover && 'transition-all duration-300 hover:shadow-soft-lg hover:border-border-strong hover:-translate-y-0.5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
