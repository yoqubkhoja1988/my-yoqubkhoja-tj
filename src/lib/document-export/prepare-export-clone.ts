import { EXPORT_DOCUMENT_CSS } from './export-styles';
import { pageWidthForOrientation, resolvePrintOrientation } from './print-orientation';

let exportStyleElement: HTMLStyleElement | null = null;

function ensureExportStyles() {
  if (exportStyleElement && document.head.contains(exportStyleElement)) return;
  exportStyleElement = document.createElement('style');
  exportStyleElement.setAttribute('data-export-styles', 'true');
  exportStyleElement.textContent = EXPORT_DOCUMENT_CSS;
  document.head.appendChild(exportStyleElement);
}

/** input/textarea/select → матн барои чоп ва экспорт */
export function replaceFormControlsForPrint(root: HTMLElement) {
  root.querySelectorAll('input, textarea, select').forEach((node) => {
    const span = document.createElement('span');
    if (node instanceof HTMLSelectElement) {
      span.textContent = node.value || '—';
    } else {
      span.textContent = (node as HTMLInputElement | HTMLTextAreaElement).value || '—';
    }
    node.replaceWith(span);
  });
}

/** Нусхаи ҳуҷҷат барои экспорт — бе матнҳои изофагӣ, қиматҳои input */
export function prepareExportClone(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('.print-supplement').forEach((node) => node.remove());

  replaceFormControlsForPrint(clone);

  clone.classList.add('export-render');
  clone.style.background = '#ffffff';
  clone.style.color = '#0f172a';

  return clone;
}

function inlineRgbStyles(source: Element, target: Element) {
  if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return;

  const computed = window.getComputedStyle(source);
  const props = [
    'color',
    'background-color',
    'font-size',
    'font-weight',
    'font-family',
    'text-align',
    'padding',
    'border',
    'display',
    'width',
    'min-width',
    'vertical-align',
    'line-height',
    'white-space',
  ];

  for (const cssProp of props) {
    const value = computed.getPropertyValue(cssProp);
    if (value) {
      target.style.setProperty(cssProp, value);
    }
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  for (let i = 0; i < sourceChildren.length; i += 1) {
    inlineRgbStyles(sourceChildren[i], targetChildren[i]);
  }
}

export async function waitForExportLayout() {
  await document.fonts?.ready;
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function mountExportClone(element: HTMLElement): {
  clone: HTMLElement;
  container: HTMLDivElement;
  cleanup: () => void;
} {
  ensureExportStyles();

  const clone = prepareExportClone(element);
  inlineRgbStyles(element, clone);

  const orientation = resolvePrintOrientation(element);
  const baseWidth = pageWidthForOrientation(orientation);
  const table = element.querySelector('table');
  const tableWidth = table instanceof HTMLElement ? table.scrollWidth : 0;
  const widthPx = Math.max(baseWidth, element.scrollWidth, tableWidth) + 40;

  const container = document.createElement('div');
  container.setAttribute('data-export-container', 'true');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = `${widthPx}px`;
  container.style.maxHeight = '100vh';
  container.style.overflow = 'auto';
  container.style.zIndex = '2147483646';
  container.style.background = '#ffffff';
  container.style.padding = '0';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';

  clone.style.width = '100%';
  container.appendChild(clone);
  document.body.appendChild(container);

  return {
    clone,
    container,
    cleanup: () => {
      container.remove();
    },
  };
}
