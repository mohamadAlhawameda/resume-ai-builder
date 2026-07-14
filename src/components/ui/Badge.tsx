import React from 'react';
import clsx from 'clsx';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'purple' | 'indigo';

const tones: Record<Tone, string> = {
  blue: 'bg-primary/10 text-primary border-primary/20',
  green: 'bg-success/10 text-success border-success/20',
  amber: 'bg-warning/10 text-warning border-warning/20',
  red: 'bg-danger/10 text-danger border-danger/20',
  slate: 'bg-muted text-muted-foreground border-border',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/25',
  indigo: 'bg-accent/10 text-accent border-accent/20',
};

export default function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Pick a badge tone for a 0–100 score. */
export function scoreTone(score: number): Tone {
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'amber';
  return 'red';
}
