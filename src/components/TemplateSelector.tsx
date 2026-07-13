'use client';

import React from 'react';
import clsx from 'clsx';
import type { TemplateId } from '@/lib/types';

const TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: 'classic', label: 'Classic', hint: 'Traditional serif — safest for ATS' },
  { id: 'modern', label: 'Modern', hint: 'Clean with accent headings' },
  { id: 'minimal', label: 'Minimal', hint: 'Compact and understated' },
  { id: 'executive', label: 'Executive', hint: 'Two-column with dark sidebar' },
  { id: 'creative', label: 'Creative', hint: 'Bold banner for design roles' },
];

type TemplateSelectorProps = {
  template: string;
  setTemplate: (value: string) => void;
};

export default function TemplateSelector({ template, setTemplate }: TemplateSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Resume template" className="flex flex-wrap gap-2">
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          role="radio"
          aria-checked={template === tpl.id}
          title={tpl.hint}
          onClick={() => setTemplate(tpl.id)}
          className={clsx(
            'px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
            template === tpl.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
          )}
        >
          {tpl.label}
        </button>
      ))}
    </div>
  );
}
