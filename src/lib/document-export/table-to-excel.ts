import type ExcelJS from 'exceljs';

import {
  EXCEL_COLORS,
  headerBgForRow,
  isHeaderRow,
  styleExcelCell,
  thinBorder,
} from './excel-styles';

function getCellText(cell: Element): string {
  return cell.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function cellAlign(cell: Element): ExcelJS.Alignment['horizontal'] {
  if (cell.classList.contains('text-right')) return 'right';
  if (cell.classList.contains('text-center')) return 'center';
  return 'left';
}

function rowBg(row: HTMLTableRowElement): string | undefined {
  const fromClass = headerBgForRow(row);
  if (fromClass) return fromClass;
  if (row.classList.contains('bg-slate-100')) return 'FFF1F5F9';
  if (row.classList.contains('font-semibold') || row.classList.contains('font-bold')) {
    return EXCEL_COLORS.headerGray;
  }
  return undefined;
}

export function exportTableToSheet(
  sheet: ExcelJS.Worksheet,
  table: HTMLTableElement,
  startRow: number
): number {
  const occupied = new Set<string>();
  const key = (row: number, col: number) => `${row},${col}`;

  let rowIndex = startRow;
  const rows = table.querySelectorAll('tr');

  rows.forEach((row) => {
    let colIndex = 0;
    const htmlRow = row as HTMLTableRowElement;
    const rowBackground = rowBg(htmlRow);
    const isHeader = isHeaderRow(htmlRow);

    row.querySelectorAll('th, td').forEach((cell) => {
      while (occupied.has(key(rowIndex, colIndex))) colIndex += 1;

      const colspan = Number(cell.getAttribute('colspan') || 1);
      const rowspan = Number(cell.getAttribute('rowspan') || 1);
      const excelCol = colIndex + 1;
      const value = getCellText(cell);
      const isTh = cell.tagName === 'TH';

      if (rowspan > 1 || colspan > 1) {
        sheet.mergeCells(rowIndex, excelCol, rowIndex + rowspan - 1, excelCol + colspan - 1);
      }

      styleExcelCell(sheet.getCell(rowIndex, excelCol), {
        value,
        bold: isHeader || isTh || htmlRow.classList.contains('font-semibold') || htmlRow.classList.contains('font-bold'),
        size: isHeader || isTh ? 10 : 11,
        bg: isTh ? EXCEL_COLORS.headerBlue : rowBackground,
        wrap: true,
        hAlign: cellAlign(cell),
      });

      for (let dr = 0; dr < rowspan; dr += 1) {
        for (let dc = 0; dc < colspan; dc += 1) {
          occupied.add(key(rowIndex + dr, colIndex + dc));
          if (dr > 0 || dc > 0) {
            const merged = sheet.getCell(rowIndex + dr, excelCol + dc);
            merged.border = thinBorder;
            if (rowBackground || isTh) {
              styleExcelCell(merged, { bg: isTh ? EXCEL_COLORS.headerBlue : rowBackground });
            }
          }
        }
      }

      colIndex += colspan;
    });

    rowIndex += 1;
  });

  return rowIndex;
}

export function autoFitSheetColumns(sheet: ExcelJS.Worksheet, maxCol: number) {
  for (let col = 1; col <= maxCol; col += 1) {
    let maxLen = 8;
    sheet.getColumn(col).eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = Math.min(len, 52);
    });
    sheet.getColumn(col).width = maxLen + 2;
  }
}
