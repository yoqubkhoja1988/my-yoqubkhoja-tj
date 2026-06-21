import type ExcelJS from 'exceljs';
import {
  TurnoverStatementDocument,
  formatTurnoverPeriodLabel,
  formatTurnoverStatementAmount,
} from '@/lib/budget-turnover-statement';
import { downloadBlob } from '@/lib/document-export/download-blob';

function setAmount(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '#,##0.00';
}

export async function buildTurnoverStatementWorkbook(
  document: TurnoverStatementDocument,
  organizationName: string
): Promise<ExcelJS.Workbook> {
  const Excel = (await import('exceljs')).default;
  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet('Гардиш-салдо');

  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'ВЕДОМОСТИ ГАРДИШИ - САЛДО';
  sheet.getCell('A1').font = { bold: true, size: 12 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = organizationName;
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  sheet.mergeCells('A4:B4');
  sheet.getCell('A4').value = 'ҲИСОБ';
  sheet.mergeCells('C4:D4');
  sheet.getCell('C4').value = 'Салдо дар аввали давра';
  sheet.mergeCells('E4:F4');
  sheet.getCell('E4').value = 'Гардиш ба давра';
  sheet.mergeCells('G4:H4');
  sheet.getCell('G4').value = 'Салдо дар охири давра';

  sheet.getCell('C5').value = formatTurnoverPeriodLabel(document.periodFrom);
  sheet.getCell('G5').value = formatTurnoverPeriodLabel(document.periodTo);

  const headerRow = 6;
  ['Номгӯи ҳисоб', 'Рамз', 'Дебет', 'Кредит', 'Дебет', 'Кредит', 'Дебет', 'Кредит'].forEach(
    (label, index) => {
      const cell = sheet.getCell(headerRow, index + 1);
      cell.value = label;
      cell.font = { bold: true };
    }
  );

  let rowIndex = headerRow + 1;
  for (const row of document.rows) {
    if (row.kind === 'header') {
      sheet.mergeCells(rowIndex, 1, rowIndex, 8);
      sheet.getCell(rowIndex, 1).value = row.label;
      sheet.getCell(rowIndex, 1).font = { bold: true };
    } else {
      sheet.getCell(rowIndex, 1).value = row.label;
      sheet.getCell(rowIndex, 2).value = row.accountCode ?? '';
      setAmount(sheet.getCell(rowIndex, 3), row.openingDebit);
      setAmount(sheet.getCell(rowIndex, 4), row.openingCredit);
      setAmount(sheet.getCell(rowIndex, 5), row.debitTurnover);
      setAmount(sheet.getCell(rowIndex, 6), row.creditTurnover);
      setAmount(sheet.getCell(rowIndex, 7), row.closingDebit);
      setAmount(sheet.getCell(rowIndex, 8), row.closingCredit);
    }
    rowIndex += 1;
  }

  sheet.getCell(rowIndex, 1).value = 'Ҷамъ';
  sheet.getCell(rowIndex, 1).font = { bold: true };
  setAmount(sheet.getCell(rowIndex, 3), document.totals.openingDebit);
  setAmount(sheet.getCell(rowIndex, 4), document.totals.openingCredit);
  setAmount(sheet.getCell(rowIndex, 5), document.totals.debitTurnover);
  setAmount(sheet.getCell(rowIndex, 6), document.totals.creditTurnover);
  setAmount(sheet.getCell(rowIndex, 7), document.totals.closingDebit);
  setAmount(sheet.getCell(rowIndex, 8), document.totals.closingCredit);

  sheet.columns = [
    { width: 42 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
  ];

  return workbook;
}

export async function downloadTurnoverStatementExcel(
  document: TurnoverStatementDocument,
  organizationName: string,
  fiscalYear: string
): Promise<void> {
  const workbook = await buildTurnoverStatementWorkbook(document, organizationName);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  await downloadBlob(blob, `vedomosti-gardish-saldo-${fiscalYear}.xlsx`);
}

export { formatTurnoverStatementAmount };
