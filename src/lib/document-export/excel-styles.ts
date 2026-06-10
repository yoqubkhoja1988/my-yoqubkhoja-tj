import type ExcelJS from 'exceljs';

export const EXCEL_COLORS = {
  headerYellow: 'FFFFF2CC',
  headerBlue: 'FFDDEBF7',
  headerGray: 'FFF8FAFC',
  white: 'FFFFFFFF',
  textDark: 'FF0F172A',
  border: 'FFCBD5E1',
} as const;

export const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: EXCEL_COLORS.border } },
  left: { style: 'thin', color: { argb: EXCEL_COLORS.border } },
  bottom: { style: 'thin', color: { argb: EXCEL_COLORS.border } },
  right: { style: 'thin', color: { argb: EXCEL_COLORS.border } },
};

export function styleExcelCell(
  cell: ExcelJS.Cell,
  options: {
    value?: ExcelJS.CellValue;
    bold?: boolean;
    size?: number;
    bg?: string;
    hAlign?: ExcelJS.Alignment['horizontal'];
    wrap?: boolean;
  }
) {
  if (options.value !== undefined) cell.value = options.value;
  cell.font = {
    name: 'Times New Roman',
    size: options.size ?? 11,
    bold: options.bold ?? false,
    color: { argb: EXCEL_COLORS.textDark },
  };
  cell.alignment = {
    horizontal: options.hAlign ?? 'left',
    vertical: 'middle',
    wrapText: options.wrap ?? false,
  };
  if (options.bg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.bg } };
  }
  cell.border = thinBorder;
}

export function isHeaderRow(row: HTMLTableRowElement): boolean {
  if (row.parentElement?.tagName === 'THEAD') return true;
  return row.classList.contains('bg-sky-100') || row.classList.contains('bg-slate-50');
}

export function headerBgForRow(row: HTMLTableRowElement): string | undefined {
  if (row.classList.contains('bg-sky-100')) return EXCEL_COLORS.headerBlue;
  if (row.classList.contains('bg-slate-50')) return EXCEL_COLORS.headerGray;
  if (row.parentElement?.tagName === 'THEAD') return EXCEL_COLORS.headerBlue;
  return undefined;
}
