'use client';

import React from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

interface StepNavigationProps {
  steps: string[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
}

export default function StepNavigation({ steps, currentStep, onStepChange }: StepNavigationProps) {
  return (
    <nav className="flex flex-wrap gap-2 mb-6" aria-label="Form steps">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = currentStep === i;
        return (
          <button
            key={label}
            onClick={() => onStepChange(i)}
            aria-current={active ? 'step' : undefined}
            className={clsx(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200 text-sm font-medium whitespace-nowrap',
              active
                ? 'bg-blue-600 text-white shadow-md'
                : done
                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
            )}
          >
            {done ? (
              <Check className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <span
                className={clsx(
                  'w-4.5 h-4.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                  active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
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
