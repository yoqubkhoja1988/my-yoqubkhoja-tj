import { resolveDocumentExportFontFamily } from '@/lib/legal-document-typography';
import { downloadBlob, sanitizeFilename } from './download-blob';
import { buildWordDocumentHtml, prepareWordHtml } from './prepare-word-html';
import { mountExportClone, waitForExportLayout } from './prepare-export-clone';
import { resolvePrintOrientation } from './print-orientation';

export async function exportDocumentToWord(documentId: string, filename: string) {
  const element = document.getElementById(documentId);
  if (!element) {
    throw new Error(`Document #${documentId} not found`);
  }

  const orientation = resolvePrintOrientation(element);
  const { clone, cleanup } = mountExportClone(element);

  try {
    await waitForExportLayout();
    const fontFamily = resolveDocumentExportFontFamily(element);
    const bodyHtml = prepareWordHtml(element, clone);
    const html = buildWordDocumentHtml(bodyHtml, orientation, fontFamily);
    const blob = new Blob(['\ufeff', html], {
      type: 'application/vnd.ms-word;charset=utf-8',
    });
    downloadBlob(blob, `${sanitizeFilename(filename)}.doc`);
  } finally {
    cleanup();
  }
}
