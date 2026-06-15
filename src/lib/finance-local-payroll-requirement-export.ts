import type ExcelJS from 'exceljs';
import {
  buildLocalPayrollRequirementDocumentTitle,
  LocalPayrollRequirementDocument,
  LocalPayrollRequirementGroupMetrics,
} from '@/lib/finance-local-payroll-requirement';
import { downloadBlob } from '@/lib/document-export/download-blob';

const TEMPLATE_URL = '/templates/kg-local-payroll-requirement-template.xlsx';

const METRIC_COLUMNS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
const PAYMENT_COLUMNS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

function clearCell(cell: ExcelJS.Cell) {
  cell.value = null;
}

function setNumber(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '#,##0.00';
}

function clearAndSetNumber(cell: ExcelJS.Cell, value: number) {
  clearCell(cell);
  setNumber(cell, value);
}

function clearMetricColumns(sheet: ExcelJS.Worksheet, row: number) {
  for (const column of METRIC_COLUMNS) {
    clearCell(sheet.getCell(row, column));
  }
}

function writeMetricsValues(
  sheet: ExcelJS.Worksheet,
  row: number,
  metrics: LocalPayrollRequirementGroupMetrics
) {
  clearAndSetNumber(sheet.getCell(row, 3), metrics.approvedUnits);
  clearAndSetNumber(sheet.getCell(row, 4), metrics.approvedFund);
  clearAndSetNumber(sheet.getCell(row, 5), metrics.decree469);
  clearAndSetNumber(sheet.getCell(row, 6), metrics.vacantUnits);
  clearAndSetNumber(sheet.getCell(row, 7), metrics.vacantAmount);
  clearAndSetNumber(sheet.getCell(row, 8), metrics.actualUnits);
  clearAndSetNumber(sheet.getCell(row, 9), metrics.actualAmount);
  clearAndSetNumber(sheet.getCell(row, 10), metrics.incomeTax);
  clearAndSetNumber(sheet.getCell(row, 11), metrics.fhea1);
  clearAndSetNumber(sheet.getCell(row, 12), metrics.unionFee);
  clearAndSetNumber(sheet.getCell(row, 13), metrics.hhdt);
  clearAndSetNumber(sheet.getCell(row, 14), metrics.otherDeductions);
  clearAndSetNumber(sheet.getCell(row, 15), metrics.totalDeductions);
  clearAndSetNumber(sheet.getCell(row, 16), metrics.netPay);
  clearAndSetNumber(sheet.getCell(row, 17), metrics.fhea25);
}

function writeEmployeeRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  metrics: LocalPayrollRequirementGroupMetrics
) {
  sheet.getCell(row, 1).value = 1;
  sheet.getCell(row, 2).value = 'Ҳамагӣ кормандон';
  writeMetricsValues(sheet, row, metrics);
}

function writeBankFeeRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  bankFee: Pick<LocalPayrollRequirementGroupMetrics, 'actualAmount' | 'fhea25'>
) {
  sheet.getCell(row, 1).value = 2;
  sheet.getCell(row, 2).value = 'Хизмати бонк-0,5%';
  clearMetricColumns(sheet, row);
  clearAndSetNumber(sheet.getCell(row, 9), bankFee.actualAmount);
  clearAndSetNumber(sheet.getCell(row, 17), bankFee.fhea25);
}

function writeSubtotalRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  metrics: LocalPayrollRequirementGroupMetrics
) {
  sheet.getCell(row, 1).value = 'ЧАМЪ:';
  sheet.getCell(row, 2).value = 'ЧАМЪ:';
  writeMetricsValues(sheet, row, metrics);
}

function writeGrandTotalRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  metrics: LocalPayrollRequirementGroupMetrics
) {
  clearCell(sheet.getCell(row, 1));
  sheet.getCell(row, 2).value = 'Х А М А Г И';
  writeMetricsValues(sheet, row, metrics);
}

function clearPaymentRow(sheet: ExcelJS.Worksheet, row: number) {
  for (const column of PAYMENT_COLUMNS) {
    clearCell(sheet.getCell(row, column));
  }
}

function writePaymentRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  payment: LocalPayrollRequirementDocument['paymentRows'][number]
) {
  clearPaymentRow(sheet, row);
  sheet.getCell(row, 3).value = payment.article;
  clearAndSetNumber(sheet.getCell(row, 4), payment.salaryPay);
  clearAndSetNumber(sheet.getCell(row, 5), payment.incomeTax);
  clearAndSetNumber(sheet.getCell(row, 6), payment.fhea1);
  clearAndSetNumber(sheet.getCell(row, 7), payment.unionFee);
  clearAndSetNumber(sheet.getCell(row, 8), payment.hhdt);
  clearAndSetNumber(sheet.getCell(row, 9), payment.otherDeductions);
  clearAndSetNumber(sheet.getCell(row, 10), payment.totalDeductions);
  clearAndSetNumber(sheet.getCell(row, 11), payment.bankFee);
  clearAndSetNumber(sheet.getCell(row, 12), payment.sanatorium15);
  clearAndSetNumber(sheet.getCell(row, 13), payment.fhea25Payment);
  clearAndSetNumber(sheet.getCell(row, 14), payment.totalExpense);
}

async function loadTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const Excel = (await import('exceljs')).default;
  const workbook = new Excel.Workbook();
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error('Failed to load payroll requirement template');
  }
  const buffer = await response.arrayBuffer();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function writeGroupHeader(sheet: ExcelJS.Worksheet, row: number, title: string) {
  sheet.getCell(row, 1).value = title;
}

export async function buildLocalPayrollRequirementWorkbook(
  document: LocalPayrollRequirementDocument
): Promise<ExcelJS.Workbook> {
  const workbook = await loadTemplateWorkbook();
  const sheet =
    workbook.getWorksheet('талабот') ??
    workbook.worksheets.find((item) => item.name.toLowerCase().includes('талабот')) ??
    workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Payroll requirement template sheet not found');
  }

  sheet.getCell('A2').value = buildLocalPayrollRequirementDocumentTitle(document.monthLabel);
  sheet.getCell('A3').value = document.organizationName;

  let row = 8;
  for (const group of document.groups) {
    writeGroupHeader(sheet, row, group.title);
    row += 1;
    writeEmployeeRow(sheet, row, group.employees);
    row += 1;
    writeBankFeeRow(sheet, row, group.bankFee);
    row += 1;
    writeSubtotalRow(sheet, row, group.subtotal);
    row += 1;
  }

  const grandTotalRow = row;
  writeGrandTotalRow(sheet, row, document.grandTotal);

  const paymentRow2111 = grandTotalRow + 4;
  const paymentRow2121 = paymentRow2111 + 1;
  const paymentSpacerRow = paymentRow2121 + 1;
  const paymentTotalRow = paymentSpacerRow + 1;

  writePaymentRow(sheet, paymentRow2111, document.paymentRows[0]);
  writePaymentRow(sheet, paymentRow2121, document.paymentRows[1]);
  clearPaymentRow(sheet, paymentSpacerRow);
  writePaymentRow(sheet, paymentTotalRow, document.paymentTotal);

  const directorRow = paymentRow2111 + 10;
  const accountantRow = paymentRow2111 + 13;
  sheet.getCell(directorRow, 10).value = document.directorName;
  sheet.getCell(accountantRow, 10).value = document.accountantName;

  return workbook;
}

export async function downloadLocalPayrollRequirementExcel(
  document: LocalPayrollRequirementDocument
): Promise<void> {
  const workbook = await buildLocalPayrollRequirementWorkbook(document);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  await downloadBlob(blob, `talabot-muzdi-maosh-${document.month}.xlsx`);
}

export function localPayrollRequirementFileName(month: string): string {
  return `talabot-muzdi-maosh-${month}.xlsx`;
}
