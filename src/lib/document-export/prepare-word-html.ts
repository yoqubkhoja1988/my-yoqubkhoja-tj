import { resolveDocumentExportFontFamily } from '@/lib/legal-document-typography';

function convertGridsToTables(root: HTMLElement, fontFamily: string) {
  root.querySelectorAll('.grid').forEach((grid) => {
    if (!(grid instanceof HTMLElement)) return;

    const cols = grid.className.includes('grid-cols-3') || grid.className.includes('md:grid-cols-3')
      ? 3
      : grid.className.includes('grid-cols-2') || grid.className.includes('md:grid-cols-2')
        ? 2
        : Math.max(1, grid.children.length);

    const table = document.createElement('table');
    table.setAttribute('width', '100%');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginTop = '24px';

    const tr = document.createElement('tr');
    Array.from(grid.children).forEach((child) => {
      const td = document.createElement('td');
      td.style.width = `${Math.floor(100 / cols)}%`;
      td.style.verticalAlign = 'top';
      td.style.padding = '8px 12px';
      td.style.fontFamily = fontFamily;
      td.style.fontSize = '12pt';
      td.style.color = '#0f172a';
      td.innerHTML = (child as HTMLElement).innerHTML;
      tr.appendChild(td);
    });

    table.appendChild(tr);
    grid.replaceWith(table);
  });
}

function forceLightTheme(target: HTMLElement) {
  const cs = window.getComputedStyle(target);
  const bg = cs.backgroundColor;
  const color = cs.color;

  if (
    target.tagName === 'TH' ||
    target.classList.contains('bg-sky-100') ||
    target.closest('thead')
  ) {
    target.style.backgroundColor = '#e0f2fe';
  } else if (target.classList.contains('bg-amber-100') || target.tagName === 'HEADER') {
    target.style.backgroundColor = '#fef3c7';
  } else if (target.classList.contains('bg-slate-50') || target.classList.contains('bg-slate-100')) {
    target.style.backgroundColor = '#f8fafc';
  } else if (bg && !bg.includes('0, 0, 0, 0') && !bg.includes('transparent')) {
    if (bg.includes('10,') || bg.includes('17,') || bg.includes('30,')) {
      target.style.backgroundColor = '#ffffff';
    } else {
      target.style.backgroundColor = bg;
    }
  } else {
    target.style.backgroundColor = '#ffffff';
  }

  if (!color || color.includes('241,') || color.includes('148,') || color.includes('94,')) {
    target.style.color = '#0f172a';
  } else {
    target.style.color = color;
  }
}

function inlineExportStyles(source: HTMLElement, target: HTMLElement, fontFamily: string) {
  const cs = window.getComputedStyle(source);
  const props = [
    'font-family',
    'font-size',
    'font-weight',
    'text-align',
    'vertical-align',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin-top',
    'margin-bottom',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'line-height',
    'text-transform',
    'white-space',
    'width',
  ];

  target.style.fontFamily = fontFamily;

  for (const prop of props) {
    const value = cs.getPropertyValue(prop);
    if (value) {
      target.style.setProperty(prop, value);
    }
  }

  if (target.tagName === 'TABLE') {
    target.style.borderCollapse = 'collapse';
    target.style.width = '100%';
  }

  if (target.tagName === 'TH' || target.tagName === 'TD') {
    target.style.border = '1px solid #cbd5e1';
    target.style.padding = '4px 6px';
    target.style.verticalAlign = 'top';
  }

  forceLightTheme(target);
}

export function prepareWordHtml(source: HTMLElement, clone: HTMLElement): string {
  const fontFamily = resolveDocumentExportFontFamily(source);
  convertGridsToTables(clone, fontFamily);

  const sourceNodes = [source, ...source.querySelectorAll('*')];
  const cloneNodes = [clone, ...clone.querySelectorAll('*')];

  for (let i = 0; i < sourceNodes.length && i < cloneNodes.length; i += 1) {
    const src = sourceNodes[i];
    const tgt = cloneNodes[i];
    if (src instanceof HTMLElement && tgt instanceof HTMLElement) {
      inlineExportStyles(src, tgt, fontFamily);
    }
  }

  clone.style.background = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.fontFamily = fontFamily;
  clone.style.fontSize = '12pt';
  clone.style.padding = '16px 20px';

  return clone.innerHTML;
}

export function buildWordDocumentHtml(
  bodyHtml: string,
  orientation: 'portrait' | 'landscape',
  fontFamily = "'Times New Roman', Times, serif"
): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: A4 ${orientation};
    margin: 12mm;
  }
  div.Section1 { page: Section1; }
  body {
    margin: 0;
    padding: 0;
    font-family: ${fontFamily};
    font-size: 12pt;
    color: #0f172a;
    background: #ffffff;
  }
  table { border-collapse: collapse; width: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  th, td { border: 1pt solid #cbd5e1; padding: 4pt 6pt; vertical-align: top; }
  h1, h2, h3, h4, p { margin: 0.4em 0; }
  strong { font-weight: bold; }
</style>
</head>
<body>
<div class="Section1">
${bodyHtml}
</div>
</body>
</html>`;
}
