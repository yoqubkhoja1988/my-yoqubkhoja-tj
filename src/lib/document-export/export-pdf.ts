import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

import { sanitizeFilename } from './download-blob';
import { mountExportClone, waitForExportLayout } from './prepare-export-clone';
import { resolvePrintOrientation } from './print-orientation';

export async function exportDocumentToPdf(documentId: string, filename: string) {
  const element = document.getElementById(documentId);
  if (!element) {
    throw new Error(`Document #${documentId} not found`);
  }

  const orientation = resolvePrintOrientation(element);
  const { clone, cleanup } = mountExportClone(element);

  try {
    await waitForExportLayout();

    const canvas = await toCanvas(clone, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: false,
    });

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const margin = 8;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;

    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let offset = 0;
    let page = 0;

    while (offset < imgHeight) {
      if (page > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'PNG', margin, margin - offset, contentWidth, imgHeight);
      offset += contentHeight;
      page += 1;
    }

    pdf.save(`${sanitizeFilename(filename)}.pdf`);
  } finally {
    cleanup();
  }
}
