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
        'bg-white rounded-2xl border border-slate-200 shadow-sm',
        padded && 'p-5 sm:p-6',
        hover && 'transition-all duration-200 hover:shadow-md hover:border-slate-300',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
