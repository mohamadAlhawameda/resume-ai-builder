// Shared types & helpers for resume templates.
// IMPORTANT: templates must use inline styles with hex/rgb colors only —
// html2canvas (PDF export) cannot parse Tailwind v4's oklch() colors.

import type { ResumeData, SectionKey, TemplateCustomization } from '@/lib/types';
import { DEFAULT_CUSTOMIZATION, DEFAULT_SECTION_ORDER } from '@/lib/types';

export interface TemplateProps {
  data: ResumeData;
}

export function getCustomization(data: ResumeData): TemplateCustomization {
  return { ...DEFAULT_CUSTOMIZATION, ...(data.customization || {}) };
}

export function visibleSections(data: ResumeData): SectionKey[] {
  const order =
    data.sectionOrder && data.sectionOrder.length > 0 ? data.sectionOrder : DEFAULT_SECTION_ORDER;
  const hidden = new Set(data.hiddenSections || []);
  return order.filter((s) => !hidden.has(s));
}

export function fontStack(family: TemplateCustomization['fontFamily']): string {
  switch (family) {
    case 'serif':
      return "Georgia, 'Times New Roman', serif";
    case 'mono':
      return "'Courier New', Courier, monospace";
    default:
      return "'Helvetica Neue', Arial, 'Segoe UI', sans-serif";
  }
}

export function densityScale(density: TemplateCustomization['density']): number {
  switch (density) {
    case 'compact':
      return 0.8;
    case 'relaxed':
      return 1.2;
    default:
      return 1;
  }
}

/** Split a description into trimmed bullet lines. */
export function bulletLines(text?: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
}

export function contactLine(data: ResumeData): string[] {
  return [
    data.email,
    data.phone,
    [data.city, data.postalCode].filter(Boolean).join(' '),
  ].filter(Boolean) as string[];
}
