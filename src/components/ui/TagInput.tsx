'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helper?: string;
}

/** Chip-style multi-value input (Enter or comma adds a tag). */
export default function TagInput({ id, label, values, onChange, placeholder, helper }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const v = draft.trim().replace(/,+$/, '');
    if (!v) return;
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      onChange([...values, v]);
    }
    setDraft('');
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 items-center w-full min-h-[46px] px-3 py-2 border border-border-strong rounded-xl bg-surface focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full ps-2.5 pe-1 py-0.5 text-xs font-medium"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="p-0.5 rounded-full hover:bg-primary/20 transition"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground focus:outline-none py-1"
        />
      </div>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
