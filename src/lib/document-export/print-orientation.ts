export type PrintOrientation = 'portrait' | 'landscape';

/** A4 @ 96dpi */
export const A4_PORTRAIT_WIDTH_PX = 794;
export const A4_LANDSCAPE_WIDTH_PX = 1123;

/** Ширинаи қобили чоп дар portrait (бо ҳошия) */
const PORTRAIT_CONTENT_MAX_PX = 720;

function measureContentSize(element: HTMLElement): { width: number; height: number } {
  const table = element.querySelector('table');
  const widths = [element.scrollWidth, element.offsetWidth];
  const heights = [element.scrollHeight, element.offsetHeight];

  if (table instanceof HTMLElement) {
    widths.push(table.scrollWidth, table.offsetWidth);
    heights.push(table.scrollHeight, table.offsetHeight);
  }

  return {
    width: Math.max(...widths.filter((value) => value > 0), 0),
    height: Math.max(...heights.filter((value) => value > 0), 0),
  };
}

/** Ориентатсия аз рӯи андозаи ҳуҷҷат — васеъ → landscape, баланд → portrait */
export function resolvePrintOrientation(element: HTMLElement): PrintOrientation {
  const { width, height } = measureContentSize(element);

  if (width > PORTRAIT_CONTENT_MAX_PX) {
    return 'landscape';
  }

  if (width > 0 && height > 0 && width > height * 1.12) {
    return 'landscape';
  }

  return 'portrait';
}

export function getPrintOrientation(documentId: string): PrintOrientation {
  if (typeof document === 'undefined') return 'portrait';
  const element = document.getElementById(documentId);
  if (!element) return 'portrait';
  return resolvePrintOrientation(element);
}

export function pageWidthForOrientation(orientation: PrintOrientation): number {
  return orientation === 'landscape' ? A4_LANDSCAPE_WIDTH_PX : A4_PORTRAIT_WIDTH_PX;
}
