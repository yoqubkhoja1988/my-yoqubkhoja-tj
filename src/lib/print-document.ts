import { resolvePrintOrientation } from '@/lib/document-export/print-orientation';

/** Чопи танҳо як ҳуҷҷат — `.print-active` + ориентатсияи варақ */
export function printDocument(documentId: string) {
  const element = document.getElementById(documentId);
  const orientation = element ? resolvePrintOrientation(element) : 'portrait';

  document.documentElement.dataset.printOrientation = orientation;

  if (element) {
    element.classList.add('print-active');
  }

  const cleanup = () => {
    element?.classList.remove('print-active');
    delete document.documentElement.dataset.printOrientation;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
}
