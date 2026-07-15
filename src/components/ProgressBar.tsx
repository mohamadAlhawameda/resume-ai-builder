'use client';

import React from 'react';
import { useLocale } from '@/i18n/LocaleProvider';

type ProgressBarProps = {
  step: number;
  totalSteps: number;
};

export default function ProgressBar({ step, totalSteps }: ProgressBarProps) {
  const { t } = useLocale();
  const progress = ((step + 1) / totalSteps) * 100;
  const label = t('builderPage.stepOfLabel', { current: step + 1, total: totalSteps });

  return (
    <div className="w-full mb-5">
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={label}
        />
      </div>
      <p className="text-end text-xs text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}
