export type DocumentTextBlock = {
  kind: 'text';
  lines: string[];
  center?: boolean;
  bold?: boolean;
  bg?: string;
};

export type DocumentTableBlock = {
  kind: 'table';
  table: HTMLTableElement;
};

export type DocumentBlock = DocumentTextBlock | DocumentTableBlock;

function isHiddenForExport(element: HTMLElement): boolean {
  if (element.classList.contains('print-supplement')) return true;
  return element.className.split(/\s+/).includes('print:hidden');
}

function extractLines(element: Element): string[] {
  const lines: string[] = [];
  element.querySelectorAll('p, h1, h2, h3, h4').forEach((node) => {
    const text = node.textContent?.replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  });
  if (lines.length === 0) {
    const text = element.textContent?.replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  }
  return lines;
}

function walk(node: Element, blocks: DocumentBlock[]) {
  if (!(node instanceof HTMLElement)) return;
  if (isHiddenForExport(node)) return;

  const tag = node.tagName;

  if (tag === 'HEADER') {
    const lines = extractLines(node);
    if (lines.length > 0) {
      blocks.push({ kind: 'text', lines, center: true, bold: true, bg: 'FFFFF2CC' });
    }
    return;
  }

  if (tag === 'TABLE') {
    blocks.push({ kind: 'table', table: node as HTMLTableElement });
    return;
  }

  if (tag === 'P') {
    const text = node.textContent?.replace(/\s+/g, ' ').trim();
    if (text) {
      blocks.push({
        kind: 'text',
        lines: [text],
        bold: node.querySelector('strong') !== null,
      });
    }
    return;
  }

  if (tag === 'DIV' && node.children.length === 0) {
    const text = node.textContent?.replace(/\s+/g, ' ').trim();
    if (text) {
      blocks.push({ kind: 'text', lines: [text] });
    }
    return;
  }

  for (const child of node.children) {
    walk(child, blocks);
  }
}

export function collectDocumentBlocks(root: HTMLElement): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  for (const child of root.children) {
    walk(child, blocks);
  }
  return blocks;
}

export function estimateTableColumns(table: HTMLTableElement): number {
  let maxCols = 0;
  const occupied = new Set<string>();

  table.querySelectorAll('tr').forEach((row, rowIndex) => {
    let colIndex = 0;
    row.querySelectorAll('th, td').forEach((cell) => {
      while (occupied.has(`${rowIndex},${colIndex}`)) colIndex += 1;
      const colspan = Number(cell.getAttribute('colspan') || 1);
      const rowspan = Number(cell.getAttribute('rowspan') || 1);
      maxCols = Math.max(maxCols, colIndex + colspan);
      for (let dr = 0; dr < rowspan; dr += 1) {
        for (let dc = 0; dc < colspan; dc += 1) {
          occupied.add(`${rowIndex + dr},${colIndex + dc}`);
        }
      }
      colIndex += colspan;
    });
  });

  return Math.max(maxCols, 4);
}
