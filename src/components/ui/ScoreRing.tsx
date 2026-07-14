'use client';

import React, { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';

export function scoreColor(score: number): string {
  if (score >= 80) return '#059669'; // emerald-600
  if (score >= 60) return '#2563eb'; // blue-600
  if (score >= 40) return '#d97706'; // amber-600
  return '#dc2626'; // red-600
}

/** English fallback label — prefer `useScoreLabel()` in components for a translated string. */
export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 55) return 'Good';
  if (score >= 40) return 'Needs work';
  return 'Weak';
}

export function useScoreLabel() {
  const { t } = useLocale();
  return (score: number): string => {
    if (score >= 85) return t('common.scoreExcellent');
    if (score >= 70) return t('common.scoreStrong');
    if (score >= 55) return t('common.scoreGood');
    if (score >= 40) return t('common.scoreNeedsWork');
    return t('common.scoreWeak');
  };
}

interface ScoreRingProps {
  score: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  animate?: boolean;
}

export default function ScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
  label,
  animate = true,
}: ScoreRingProps) {
  const { t } = useLocale();
  const getScoreLabel = useScoreLabel();
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const [display, setDisplay] = useState(animate ? 0 : clamped);

  useEffect(() => {
    if (!animate) {
      setDisplay(clamped);
      return;
    }
    let frame: number;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * clamped));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clamped, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;
  const color = scoreColor(clamped);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={t('common.ariaScoreLabel', { label: label || t('common.scoreDefaultLabel'), score: clamped })}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-slate-900" style={{ fontSize: size / 4 }}>
          {display}
        </span>
        <span className="text-xs font-medium" style={{ color }}>
          {label || getScoreLabel(clamped)}
        </span>
      </div>
    </div>
  );
}
