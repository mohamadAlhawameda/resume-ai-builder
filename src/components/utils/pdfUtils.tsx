import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generatePdfAndDownload(element: HTMLElement | null, filename: string) {
  if (!element) return;

  window.scrollTo(0, 0);
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, scrollY: 0 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const pxToMm = (px: number) => px * 0.264583;
  const imgWidthMm = pxToMm(canvas.width);
  const imgHeightMm = pxToMm(canvas.height);

  let renderWidth = pdfWidth;
  let renderHeight = (imgHeightMm * pdfWidth) / imgWidthMm;

  if (renderHeight > pdfHeight) {
    renderHeight = pdfHeight;
    renderWidth = (imgWidthMm * pdfHeight) / imgHeightMm;
  }

  const x = (pdfWidth - renderWidth) / 2;
  const y = 0;

  pdf.addImage(imgData, "PNG", x, y, renderWidth, renderHeight);
  pdf.save(filename);
}
