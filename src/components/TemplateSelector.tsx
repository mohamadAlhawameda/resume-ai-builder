'use client';

import React from 'react';
import clsx from 'clsx';
import type { TemplateId } from '@/lib/types';
import { useLocale } from '@/i18n/LocaleProvider';

const TEMPLATES: { id: TemplateId; labelKey: string; hintKey: string }[] = [
  { id: 'classic', labelKey: 'builderPage.templateClassic', hintKey: 'builderPage.templateClassicHint' },
  { id: 'modern', labelKey: 'builderPage.templateModern', hintKey: 'builderPage.templateModernHint' },
  { id: 'minimal', labelKey: 'builderPage.templateMinimal', hintKey: 'builderPage.templateMinimalHint' },
  { id: 'executive', labelKey: 'builderPage.templateExecutive', hintKey: 'builderPage.templateExecutiveHint' },
  { id: 'creative', labelKey: 'builderPage.templateCreative', hintKey: 'builderPage.templateCreativeHint' },
];

type TemplateSelectorProps = {
  template: string;
  setTemplate: (value: string) => void;
};

export default function TemplateSelector({ template, setTemplate }: TemplateSelectorProps) {
  const { t } = useLocale();
  return (
    <div role="radiogroup" aria-label={t('builderPage.resumeTemplateAria')} className="flex flex-wrap gap-2">
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          role="radio"
          aria-checked={template === tpl.id}
          title={t(tpl.hintKey)}
          onClick={() => setTemplate(tpl.id)}
          className={clsx(
            'px-3.5 py-2 min-h-11 rounded-xl text-sm font-medium border transition-all duration-150',
            template === tpl.id
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-surface text-muted-foreground border-border-strong hover:border-primary/50 hover:text-primary'
          )}
        >
          {t(tpl.labelKey)}
        </button>
      ))}
    </div>
  );
}
