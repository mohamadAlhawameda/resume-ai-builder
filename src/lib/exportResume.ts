// Resume export: high-quality multi-page PDF (html2canvas + jsPDF) and
// native DOCX (docx package).

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopType,
  BorderStyle,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';
import type { ResumeData, SectionKey } from './types';
import { DEFAULT_SECTION_ORDER, SECTION_LABELS } from './types';

/**
 * Render a DOM node to PDF, slicing the canvas across as many A4 pages as
 * needed (the old implementation squashed everything onto one page).
 */
export async function exportElementToPDF(element: HTMLElement | null, filename: string) {
  if (!element) return;

  window.scrollTo(0, 0);
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, scrollY: 0, backgroundColor: '#ffffff' });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight + 1) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
  } else {
    // Slice the tall canvas into page-height chunks.
    const pageCanvas = document.createElement('canvas');
    const ctx = pageCanvas.getContext('2d');
    const pagePixelHeight = Math.floor((pageHeight / imgWidth) * canvas.width);
    pageCanvas.width = canvas.width;

    let rendered = 0;
    let pageIndex = 0;
    while (rendered < canvas.height) {
      const sliceHeight = Math.min(pagePixelHeight, canvas.height - rendered);
      pageCanvas.height = sliceHeight;
      ctx?.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx?.drawImage(canvas, 0, rendered, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, sliceImgHeight);

      rendered += sliceHeight;
      pageIndex += 1;
    }
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

// ---------- DOCX ----------

const bulletsOf = (text?: string) =>
  (text || '')
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);

function hexToDocx(hex: string): string {
  return hex.replace('#', '').slice(0, 6).toUpperCase() || '2563EB';
}

/** Generate an ATS-friendly, properly structured Word document. */
export async function exportToDocx(data: ResumeData, filename: string) {
  const accent = hexToDocx(data.customization?.accentColor || '#2563eb');
  const order =
    data.sectionOrder && data.sectionOrder.length > 0 ? data.sectionOrder : DEFAULT_SECTION_ORDER;
  const hidden = new Set(data.hiddenSections || []);

  // Arabic resumes need right-to-left paragraph/run direction (w:bidi / w:rtl)
  // for Word to lay out and align the text correctly.
  const isRtl = data.language === 'ar';
  const mkPara = (opts: IParagraphOptions) =>
    new Paragraph({
      ...opts,
      bidirectional: isRtl,
      alignment: isRtl ? AlignmentType.RIGHT : opts.alignment,
    });
  const mkRun = (opts: IRunOptions) => new TextRun({ ...opts, rightToLeft: isRtl });

  const children: Paragraph[] = [];

  // Header
  children.push(
    mkPara({
      children: [mkRun({ text: data.fullName || 'Your Name', bold: true, size: 56 })],
      spacing: { after: 60 },
    })
  );
  const contactBits = [
    data.email,
    data.phone,
    [data.city, data.postalCode].filter(Boolean).join(' '),
    data.linkedIn,
    data.isDeveloper ? data.github : '',
  ].filter(Boolean);
  children.push(
    mkPara({
      children: [mkRun({ text: contactBits.join('  |  '), size: 19, color: '555555' })],
      spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 6 } },
    })
  );

  const sectionHeading = (label: string) =>
    mkPara({
      heading: HeadingLevel.HEADING_2,
      children: [mkRun({ text: label.toUpperCase(), bold: true, size: 24, color: accent })],
      spacing: { before: 240, after: 120 },
    });

  const renderers: Record<SectionKey, () => void> = {
    summary: () => {
      if (!data.summary?.trim()) return;
      children.push(sectionHeading(SECTION_LABELS.summary));
      children.push(
        mkPara({
          children: [mkRun({ text: data.summary, size: 21 })],
          spacing: { after: 120 },
        })
      );
    },
    experience: () => {
      if (data.experience.length === 0) return;
      children.push(sectionHeading(SECTION_LABELS.experience));
      for (const exp of data.experience) {
        children.push(
          mkPara({
            tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
            children: [
              mkRun({ text: `${exp.role || 'Role'}, ${exp.company || 'Company'}`, bold: true, size: 22 }),
              mkRun({ text: `\t${exp.from || ''} – ${exp.to || ''}`, italics: true, size: 19, color: '666666' }),
            ],
            spacing: { before: 120, after: 60 },
          })
        );
        for (const b of bulletsOf(exp.description)) {
          children.push(
            mkPara({
              children: [mkRun({ text: b, size: 21 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    },
    education: () => {
      if (data.education.length === 0) return;
      children.push(sectionHeading(SECTION_LABELS.education));
      for (const edu of data.education) {
        children.push(
          mkPara({
            tabStops: [{ type: TabStopType.RIGHT, position: 9600 }],
            children: [
              mkRun({ text: `${edu.degree || 'Degree'}, ${edu.school || 'School'}`, bold: true, size: 22 }),
              mkRun({ text: `\t${edu.from || ''} – ${edu.to || ''}`, italics: true, size: 19, color: '666666' }),
            ],
            spacing: { before: 100, after: 40 },
          })
        );
        for (const b of bulletsOf(edu.achievements)) {
          children.push(
            mkPara({
              children: [mkRun({ text: b, size: 21 })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    },
    skills: () => {
      const skills = data.skills.filter((s) => s.trim());
      if (skills.length === 0) return;
      children.push(sectionHeading(SECTION_LABELS.skills));
      children.push(
        mkPara({
          children: [mkRun({ text: skills.join('  ·  '), size: 21 })],
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
        })
      );
    },
  };

  for (const key of order) {
    if (!hidden.has(key)) renderers[key]();
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: isRtl ? 'Arial' : 'Calibri' } } },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 880, right: 880 } },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
