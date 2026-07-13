'use client';

import React from 'react';

type ProgressBarProps = {
  step: number;
  totalSteps: number;
};

export default function ProgressBar({ step, totalSteps }: ProgressBarProps) {
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="w-full mb-5">
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label={`Step ${step + 1} of ${totalSteps}`}
        />
      </div>
      <p className="text-right text-xs text-slate-400 mt-1.5">
        Step {step + 1} of {totalSteps}
      </p>
    </div>
  );
}
