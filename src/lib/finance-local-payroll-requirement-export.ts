import type ExcelJS from 'exceljs';
import {
  LocalPayrollRequirementDocument,
  LocalPayrollRequirementGroupMetrics,
} from '@/lib/finance-local-payroll-requirement';
import { downloadBlob } from '@/lib/document-export/download-blob';

const TEMPLATE_URL = '/templates/kg-local-payroll-requirement-template.xlsx';

function setNumber(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '#,##0.00';
}

function clearAndSetNumber(cell: ExcelJS.Cell, value: number) {
  if ('formula' in cell) {
    delete (cell as { formula?: string }).formula;
  }
  setNumber(cell, value);
}

function writeMetricsRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  metrics: LocalPayrollRequirementGroupMetrics,
  options?: { onlyAmount?: boolean; onlyBankColumns?: boolean }
) {
  if (options?.onlyBankColumns) {
    clearAndSetNumber(sheet.getCell(row, 9), metrics.actualAmount);
    clearAndSetNumber(sheet.getCell(row, 17), metrics.fhea25);
    return;
  }

  if (options?.onlyAmount) {
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
    return;
  }

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

function writePaymentRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  payment: LocalPayrollRequirementDocument['paymentRows'][number]
) {
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

  const title = `Оиди ҳисоби намудани музди маош, музди маоши додамешуда, ҷои кори холи дар мохи ${document.monthLabel}`;
  sheet.getCell('A2').value = title;
  sheet.getCell('A3').value = document.organizationName;

  const [groupA, groupB] = document.groups;

  if (groupA) {
    writeMetricsRow(sheet, 9, groupA.employees);
    writeMetricsRow(sheet, 10, {
      ...groupA.employees,
      actualAmount: groupA.bankFee.actualAmount,
      fhea25: groupA.bankFee.fhea25,
    }, { onlyBankColumns: true });
    writeMetricsRow(sheet, 11, groupA.subtotal);
  }

  if (groupB) {
    writeMetricsRow(sheet, 13, groupB.employees);
    writeMetricsRow(sheet, 14, {
      ...groupB.employees,
      actualAmount: groupB.bankFee.actualAmount,
      fhea25: groupB.bankFee.fhea25,
    }, { onlyBankColumns: true });
    writeMetricsRow(sheet, 15, groupB.subtotal);
  }

  writeMetricsRow(sheet, 16, document.grandTotal);

  writePaymentRow(sheet, 20, document.paymentRows[0]);
  writePaymentRow(sheet, 21, document.paymentRows[1]);
  writePaymentRow(sheet, 23, document.paymentTotal);

  sheet.getCell('J30').value = document.directorName;
  sheet.getCell('J33').value = document.accountantName;

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
