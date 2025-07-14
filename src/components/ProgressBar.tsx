"use client";

import React from "react";

type ProgressBarProps = {
  step: number;
  totalSteps: number;
};

export default function ProgressBar({ step, totalSteps }: ProgressBarProps) {
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="w-full mb-6">
      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-right text-xs text-gray-500 mt-1">
        Step {step + 1} of {totalSteps}
      </p>
    </div>
  );
}
