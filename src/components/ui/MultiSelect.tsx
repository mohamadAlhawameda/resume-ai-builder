'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import clsx from 'clsx';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id: string;
  label: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helper?: string;
  /** Show a search box — worth it once there are more than ~8 options. */
  searchable?: boolean;
}

/** Searchable, chip-based multi-select for fixed option lists (countries,
 * provinces/states, work styles) — TagInput is for freeform text instead. */
export default function MultiSelect({
  id,
  label,
  options,
  values,
  onChange,
  placeholder = 'Search…',
  helper,
  searchable = true,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (value: string) => {
    if (values.includes(value)) onChange(values.filter((v) => v !== value));
    else onChange([...values, value]);
  };

  const labelFor = (value: string) => options.find((o) => o.value === value)?.label || value;

  return (
    <div ref={ref} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm border border-border-strong rounded-xl bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-start"
      >
        <span className={clsx('truncate', values.length === 0 && 'text-muted-foreground')}>
          {values.length === 0 ? placeholder : `${values.length} selected`}
        </span>
        <ChevronDown className={clsx('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full ps-2.5 pe-1 py-0.5 text-xs font-medium"
            >
              {labelFor(v)}
              <button
                type="button"
                aria-label={`Remove ${labelFor(v)}`}
                onClick={() => toggle(v)}
                className="p-0.5 rounded-full hover:bg-primary/20 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-surface border border-border rounded-xl shadow-soft-lg max-h-72 overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-border shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute start-2.5 top-1/2 -translate-y-1/2" aria-hidden />
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- deliberate: this search box only renders once the dropdown is open (a user-triggered popup), matching the WAI-ARIA combobox/listbox pattern of focusing the filter field on open.
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full ps-8 pe-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
          <div role="listbox" aria-multiselectable="true" className="overflow-y-auto thin-scrollbar py-1">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-sm text-muted-foreground">No matches.</p>
            ) : (
              filtered.map((o) => {
                const selected = values.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggle(o.value)}
                    className={clsx(
                      'w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm text-start transition',
                      selected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-surface-hover'
                    )}
                  >
                    {o.label}
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
