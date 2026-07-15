'use client';

import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';

interface StepNavigationProps {
  steps: string[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
}

export default function StepNavigation({ steps, currentStep, onStepChange }: StepNavigationProps) {
  const { t } = useLocale();
  return (
    <nav className="flex flex-wrap gap-2 mb-6" aria-label={t('builderPage.formStepsAria')}>
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = currentStep === i;
        return (
          <button
            key={label}
            onClick={() => onStepChange(i)}
            aria-current={active ? 'step' : undefined}
            className={clsx(
              'inline-flex items-center gap-1.5 px-4 py-2 min-h-11 rounded-full transition-all duration-200 text-sm font-medium whitespace-nowrap',
              active
                ? 'bg-primary text-primary-foreground shadow-md'
                : done
                ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                : 'bg-surface text-muted-foreground border border-border hover:border-primary/50 hover:text-primary'
            )}
          >
            {done ? (
              <Check className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <span
                className={clsx(
                  'w-4.5 h-4.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                  active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </span>
            )}
            {label}
          </button>
        );
      })}
    </nav>
  );
}
