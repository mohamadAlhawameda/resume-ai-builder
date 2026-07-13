'use client';

import React from 'react';
import ModernTemplate from '@/components/resumeTemplates/ModernTemplate';
import ClassicTemplate from '@/components/resumeTemplates/ClassicTemplate';
import MinimalTemplate from '@/components/resumeTemplates/MinimalTemplate';
import ExecutiveTemplate from '@/components/resumeTemplates/ExecutiveTemplate';
import CreativeTemplate from '@/components/resumeTemplates/CreativeTemplate';
import type { ResumeData, TemplateId } from '@/lib/types';

interface ResumePreviewProps {
  data: ResumeData;
  template: TemplateId | string;
}

const TEMPLATES: Record<TemplateId, React.ComponentType<{ data: ResumeData }>> = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
  executive: ExecutiveTemplate,
  creative: CreativeTemplate,
};

/**
 * A4 canvas wrapper for all templates.
 * Uses inline hex colors only — html2canvas (PDF export) can't parse the
 * oklch() colors Tailwind v4 emits.
 */
export default function ResumePreview({ data, template }: ResumePreviewProps) {
  const key = (template === 'default' ? 'classic' : template) as TemplateId;
  const Template = TEMPLATES[key] || ClassicTemplate;
  // Executive/Creative paint their own edge-to-edge headers.
  const framed = key !== 'executive' && key !== 'creative';
  const isRtl = data.language === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: '#ffffff',
        color: '#000000',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        boxSizing: 'border-box',
        padding: framed ? '2rem' : 0,
        overflow: 'hidden',
        // System fonts with solid Arabic glyph coverage — avoids async
        // web-font loading races during html2canvas PDF capture.
        fontFamily: isRtl ? 'Tahoma, Arial, "Segoe UI", sans-serif' : undefined,
      }}
      className="print:p-0 print:m-0 print:shadow-none print:border-none print:rounded-none print:bg-white"
    >
      <Template data={data} />
    </div>
  );
}
