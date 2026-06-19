import type ExcelJS from 'exceljs';
import {
  BalanceSheetReportDocument,
  Form1ComputedRow,
  formatForm1Amount,
} from '@/lib/financial-report-form1';

const COLORS = {
  headerBlue: 'FF1E3A5F',
  headerYellow: 'FFFFF7D6',
  sectionGray: 'FFF1F5F9',
  white: 'FFFFFFFF',
  totalGreen: 'FFECFDF5',
  warning: 'FFFEF3C7',
  textDark: 'FF1E293B',
  border: 'FFCBD5E1',
} as const;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

function fillCell(cell: ExcelJS.Cell, options: {
  value?: ExcelJS.CellValue;
  bold?: boolean;
  size?: number;
  bg?: string;
  hAlign?: ExcelJS.Alignment['horizontal'];
  wrap?: boolean;
  numFmt?: string;
}): void {
  if (options.value !== undefined) cell.value = options.value;
  cell.font = {
    name: 'Times New Roman',
    size: options.size ?? 11,
    bold: options.bold ?? false,
    color: { argb: COLORS.textDark },
  };
  cell.alignment = {
    horizontal: options.hAlign ?? 'left',
    vertical: 'middle',
    wrapText: options.wrap ?? false,
    indent: 0,
  };
  if (options.bg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.bg } };
  }
  if (options.numFmt) cell.numFmt = options.numFmt;
  cell.border = thinBorder;
}

function writeAmount(cell: ExcelJS.Cell, value: number, bold = false): void {
  fillCell(cell, {
    value: value || 0,
    numFmt: '#,##0.00',
    hAlign: 'right',
    bold,
  });
}

function formatPeriodLabel(periodEnd: string): string {
  const date = new Date(`${periodEnd}T12:00:00`);
  if (Number.isNaN(date.getTime())) return periodEnd;
  const day = String(date.getDate()).padStart(2, '0');
  const months = [
    'январ',
    'феврал',
    'март',
    'апрел',
    'май',
    'июн',
    'июл',
    'август',
    'сентябр',
    'октябр',
    'ноябр',
    'декабр',
  ];
  return `${day} ${months[date.getMonth()] ?? ''}`;
}

function writeBalanceSheet(sheet: ExcelJS.Worksheet, document: BalanceSheetReportDocument): void {
  sheet.views = [{ showGridLines: false }];
  sheet.columns = [
    { width: 42 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 8 },
    { width: 14 },
    { width: 14 },
    { width: 10 },
    { width: 10 },
  ];

  fillCell(sheet.getCell(6, 1), {
    value: 'Ҳисобот оид ба  ҳолати молиявӣ',
    bold: true,
    size: 13,
  });
  fillCell(sheet.getCell(7, 1), { value: 'ба ҳолати' });
  fillCell(sheet.getCell(7, 6), { value: formatPeriodLabel(document.periodEndLabel), hAlign: 'center' });
  fillCell(sheet.getCell(7, 8), { value: `соли ${document.fiscalYear}`, hAlign: 'left' });
  fillCell(sheet.getCell(9, 1), { value: '(мутобиқи СҲМБДТ)', size: 10 });
  fillCell(sheet.getCell(10, 1), { value: 'ШАКЛИ  1', bold: true });

  fillCell(sheet.getCell(11, 1), { value: 'Муассиса (ташкилот)' });
  fillCell(sheet.getCell(11, 4), { value: document.organizationName, wrap: true });
  fillCell(sheet.getCell(16, 1), { value: 'РМА' });
  fillCell(sheet.getCell(16, 2), { value: document.rma ?? '' });

  fillCell(sheet.getCell(15, 1), { value: 'Воҳиди ченак' });
  fillCell(sheet.getCell(15, 3), { value: 'сомонӣ' });

  const headerRow = 23;
  fillCell(sheet.getCell(headerRow, 1), { value: 'Номгӯи нишондиҳандаҳо', bold: true, bg: COLORS.headerBlue, wrap: true });
  fillCell(sheet.getCell(headerRow, 7), { value: 'Рамзи сатр', bold: true, bg: COLORS.headerBlue, hAlign: 'center', wrap: true });
  fillCell(sheet.getCell(headerRow, 8), {
    value: 'Ба аввали давраи ҳисоботӣ',
    bold: true,
    bg: COLORS.headerBlue,
    hAlign: 'center',
    wrap: true,
  });
  fillCell(sheet.getCell(headerRow, 9), {
    value: 'Ба охири давраи ҳисоботӣ',
    bold: true,
    bg: COLORS.headerBlue,
    hAlign: 'center',
    wrap: true,
  });
  for (let col = 1; col <= 9; col += 1) {
    sheet.getCell(headerRow, col).font = {
      name: 'Times New Roman',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
  }

  let rowIndex = headerRow + 1;
  for (const row of document.rows) {
    writeForm1Row(sheet, rowIndex, row);
    rowIndex += 1;
  }

  fillCell(sheet.getCell(1, 8), { value: document.instructionRef, size: 9, wrap: true });
}

function writeForm1Row(sheet: ExcelJS.Worksheet, rowIndex: number, row: Form1ComputedRow): void {
  const isHeader = row.kind === 'header';
  const isTotal = row.kind === 'total' || row.kind === 'subtotal';
  const bg = isHeader ? COLORS.sectionGray : isTotal ? COLORS.totalGreen : COLORS.white;

  fillCell(sheet.getCell(rowIndex, 1), {
    value: `${'  '.repeat(row.indent)}${row.name}`,
    bold: isHeader || isTotal,
    bg,
    wrap: true,
  });

  if (row.rowCode) {
    fillCell(sheet.getCell(rowIndex, 7), {
      value: row.rowCode,
      hAlign: 'center',
      bold: isTotal,
      bg,
    });
  }

  if (!isHeader) {
    writeAmount(sheet.getCell(rowIndex, 8), row.opening, isTotal);
    writeAmount(sheet.getCell(rowIndex, 9), row.closing, isTotal);
    sheet.getCell(rowIndex, 8).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bg },
    };
    sheet.getCell(rowIndex, 9).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bg },
    };
  } else {
    sheet.mergeCells(rowIndex, 1, rowIndex, 6);
  }
}

function writeTrialBalance(sheet: ExcelJS.Worksheet, document: BalanceSheetReportDocument): void {
  sheet.views = [{ showGridLines: false }];
  sheet.columns = [
    { width: 14 },
    { width: 36 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  fillCell(sheet.getCell(1, 1), {
    value: `Варақаи бақиявӣ — ${document.fiscalYear}`,
    bold: true,
    size: 13,
    bg: COLORS.headerYellow,
  });
  sheet.mergeCells(1, 1, 1, 8);

  const headers = [
    'Ҳисоб',
    'Номгӯй',
    'Дт аввал',
    'Кт аввал',
    'Дт гардиш',
    'Кт гардиш',
    'Дт охир',
    'Кт охир',
  ];
  headers.forEach((title, index) => {
    fillCell(sheet.getCell(3, index + 1), {
      value: title,
      bold: true,
      bg: COLORS.headerBlue,
      hAlign: 'center',
      wrap: true,
    });
    sheet.getCell(3, index + 1).font = {
      name: 'Times New Roman',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
  });

  document.trialBalance.forEach((row, index) => {
    const excelRow = 4 + index;
    fillCell(sheet.getCell(excelRow, 1), { value: row.accountCode });
    fillCell(sheet.getCell(excelRow, 2), { value: row.accountName, wrap: true });
    writeAmount(sheet.getCell(excelRow, 3), row.openingDebit);
    writeAmount(sheet.getCell(excelRow, 4), row.openingCredit);
    writeAmount(sheet.getCell(excelRow, 5), row.debitTurnover);
    writeAmount(sheet.getCell(excelRow, 6), row.creditTurnover);
    writeAmount(sheet.getCell(excelRow, 7), row.closingDebit);
    writeAmount(sheet.getCell(excelRow, 8), row.closingCredit);
  });
}

export async function buildBalanceSheetWorkbook(
  document: BalanceSheetReportDocument
): Promise<ExcelJS.Workbook> {
  const Excel = await import('exceljs');
  const workbook = new Excel.Workbook();
  workbook.creator = 'my-yoqubkhoja-tj';
  workbook.created = new Date();

  const balanceSheet = workbook.addWorksheet('Баланс');
  writeBalanceSheet(balanceSheet, document);

  const trialBalance = workbook.addWorksheet('Варақаи бақиявӣ');
  writeTrialBalance(trialBalance, document);

  return workbook;
}

export async function downloadBalanceSheetExcel(
  document: BalanceSheetReportDocument,
  fileName: string
): Promise<void> {
  const workbook = await buildBalanceSheetWorkbook(document);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export { formatForm1Amount };
