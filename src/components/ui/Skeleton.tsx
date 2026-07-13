import React from 'react';
import clsx from 'clsx';

export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx('animate-pulse rounded-lg bg-slate-200/70', className)}
      aria-hidden="true"
    />
  );
}
