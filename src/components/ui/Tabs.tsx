'use client';

import React, { useRef } from 'react';
import clsx from 'clsx';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel: string;
}

/** Accessible tab bar: role="tablist" + roving tabindex + arrow-key
 * navigation, and scrolls horizontally on narrow viewports instead of
 * wrapping or clipping. Replaces the 4 independently hand-rolled tab bars
 * that used to live in analyze/, jobs/, profile/, and tools/ pages. */
export default function Tabs({ items, value, onChange, className, ariaLabel }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = items.findIndex((i) => i.value === value);
    if (idx === -1) return;
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % items.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = items.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      const next = items[nextIdx];
      onChange(next.value);
      refs.current[next.value]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      // Per the WAI-ARIA tabs pattern, focus lives on the active tab (roving
      // tabindex below), not the tablist container itself — tabIndex={-1}
      // keeps it out of the natural Tab order while still satisfying
      // jsx-a11y/interactive-supports-focus, which otherwise flags any
      // interactive-role container that has no tabIndex at all.
      tabIndex={-1}
      className={clsx('flex gap-1 overflow-x-auto thin-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0', className)}
    >
      {items.map((item) => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition min-h-11 sm:min-h-0',
              selected
                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden />}
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, activeValue, children, className }: TabPanelProps) {
  if (value !== activeValue) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${value}`} aria-labelledby={`tab-${value}`} className={className}>
      {children}
    </div>
  );
}
