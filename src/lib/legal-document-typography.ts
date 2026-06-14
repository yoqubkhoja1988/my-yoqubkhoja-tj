/** Шрифти расмии ҳуҷҷатҳои шартнома ва ҳисобнома-фактура (чоп, PDF, Word, Excel). */
export const LEGAL_DOCUMENT_FONT_FAMILY =
  "'Linotype Platino Pro', 'Palatino Linotype', 'Book Antiqua', Palatino, serif";

export const LEGAL_DOCUMENT_FONT_SIZE = '12pt';

export const LEGAL_DOCUMENT_LINE_HEIGHT = '1.5';

export function isLegalDocumentRoot(element: HTMLElement): boolean {
  return (
    element.classList.contains('org-legal-document') ||
    element.querySelector('.org-legal-document') !== null
  );
}

export function resolveDocumentExportFontFamily(element: HTMLElement): string {
  return isLegalDocumentRoot(element) ? LEGAL_DOCUMENT_FONT_FAMILY : "'Times New Roman', Times, serif";
}
