'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ThemeColors {
  primary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  muted: string;
  foreground: string;
  surface: string;
}

const FALLBACK: ThemeColors = {
  primary: '#2563eb',
  accent: '#4f46e5',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  border: '#e2e8f0',
  muted: '#64748b',
  foreground: '#0f172a',
  surface: '#ffffff',
};

// recharts needs resolved color strings, not CSS var() references, so this
// reads the live custom properties off <html> and re-reads them whenever the
// .dark class toggles — the same tokens defined in globals.css, kept in sync
// automatically rather than duplicated into a second light/dark chart config.
function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK);

  useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
      setColors({
        primary: get('--primary', FALLBACK.primary),
        accent: get('--accent', FALLBACK.accent),
        success: get('--success', FALLBACK.success),
        warning: get('--warning', FALLBACK.warning),
        danger: get('--danger', FALLBACK.danger),
        border: get('--border', FALLBACK.border),
        muted: get('--muted-foreground', FALLBACK.muted),
        foreground: get('--foreground', FALLBACK.foreground),
        surface: get('--surface', FALLBACK.surface),
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return colors;
}

function tooltipStyle(colors: ThemeColors) {
  return {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    fontSize: 13,
    color: colors.foreground,
    boxShadow: '0 12px 28px -12px rgba(0,0,0,0.25)',
  };
}

interface TrendLineProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: 'primary' | 'accent' | 'success';
  ariaLabel: string;
}

/** A single-series trend line — score history, weekly activity, etc. */
export function TrendLine({ data, xKey, yKey, height = 220, color = 'primary', ariaLabel }: TrendLineProps) {
  const colors = useThemeColors();
  const stroke = colors[color];
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: colors.muted, fontSize: 12 }} axisLine={{ stroke: colors.border }} tickLine={false} />
          <YAxis tick={{ fill: colors.muted, fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip contentStyle={tooltipStyle(colors)} cursor={{ stroke: colors.border }} />
          <Line type="monotone" dataKey={yKey} stroke={stroke} strokeWidth={2.5} dot={{ r: 3, fill: stroke }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SimpleBarChartProps {
  data: Array<Record<string, number | string>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: 'primary' | 'accent' | 'success';
  ariaLabel: string;
}

/** A single-series bar chart — applications per week, skill frequency, etc. */
export function SimpleBarChart({ data, xKey, yKey, height = 220, color = 'primary', ariaLabel }: SimpleBarChartProps) {
  const colors = useThemeColors();
  const fill = colors[color];
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: colors.muted, fontSize: 12 }} axisLine={{ stroke: colors.border }} tickLine={false} />
          <YAxis tick={{ fill: colors.muted, fontSize: 12 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle(colors)} cursor={{ fill: colors.border, opacity: 0.3 }} />
          <Bar dataKey={yKey} fill={fill} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DonutChartProps {
  data: Array<{ name: string; value: number; color?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' }>;
  height?: number;
  ariaLabel: string;
}

/** A small donut for status/category breakdowns (application status mix,
 * category weighting). Not meant to replace ScoreRing, which stays the
 * dedicated single-value 0–100 indicator. */
export function DonutChart({ data, height = 200, ariaLabel }: DonutChartProps) {
  const colors = useThemeColors();
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color ? colors[entry.color] : colors.primary} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle(colors)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
