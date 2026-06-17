import { resolvePrintOrientation } from '@/lib/document-export/print-orientation';
import { replaceFormControlsForPrint } from '@/lib/document-export/prepare-export-clone';

const PRINT_ROOT_ID = 'print-root';

/** Чопи танҳо як ҳуҷҷат — нусха ба `body`, пинҳон кардани UI-и барнома */
export function printDocument(documentId: string) {
  const element = document.getElementById(documentId);

  if (!element) {
    window.print();
    return;
  }

  const orientation = resolvePrintOrientation(element);
  document.documentElement.dataset.printOrientation = orientation;
  document.body.dataset.printDocument = 'true';

  const printRoot = document.createElement('div');
  printRoot.id = PRINT_ROOT_ID;

  const clone = element.cloneNode(true) as HTMLElement;
  replaceFormControlsForPrint(clone);
  clone.classList.add('print-active');
  printRoot.appendChild(clone);
  document.body.appendChild(printRoot);

  const cleanup = () => {
    printRoot.remove();
    delete document.documentElement.dataset.printOrientation;
    delete document.body.dataset.printDocument;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
}
