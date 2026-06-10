export type ExportFormat = 'pdf' | 'word' | 'excel';

export async function exportDocument(options: {
  documentId: string;
  format: ExportFormat;
  filename: string;
  customExcelExport?: () => Promise<void>;
}) {
  const { documentId, format, filename, customExcelExport } = options;

  if (format === 'excel' && customExcelExport) {
    await customExcelExport();
    return;
  }

  switch (format) {
    case 'pdf': {
      const { exportDocumentToPdf } = await import('./export-pdf');
      await exportDocumentToPdf(documentId, filename);
      break;
    }
    case 'word': {
      const { exportDocumentToWord } = await import('./export-word');
      await exportDocumentToWord(documentId, filename);
      break;
    }
    case 'excel': {
      const { exportDocumentToExcel } = await import('./export-excel-dom');
      await exportDocumentToExcel(documentId, filename);
      break;
    }
  }
}
