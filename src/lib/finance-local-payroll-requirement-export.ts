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

function writeMetricsRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  metrics: LocalPayrollRequirementGroupMetrics,
  options?: { onlyAmount?: boolean; onlyBankColumns?: boolean }
) {
  if (options?.onlyBankColumns) {
    setNumber(sheet.getCell(row, 9), metrics.actualAmount);
    setNumber(sheet.getCell(row, 17), metrics.fhea25);
    return;
  }

  if (options?.onlyAmount) {
    setNumber(sheet.getCell(row, 3), metrics.approvedUnits);
    setNumber(sheet.getCell(row, 4), metrics.approvedFund);
    setNumber(sheet.getCell(row, 5), metrics.decree469);
    setNumber(sheet.getCell(row, 6), metrics.vacantUnits);
    setNumber(sheet.getCell(row, 7), metrics.vacantAmount);
    setNumber(sheet.getCell(row, 8), metrics.actualUnits);
    setNumber(sheet.getCell(row, 9), metrics.actualAmount);
    setNumber(sheet.getCell(row, 10), metrics.incomeTax);
    setNumber(sheet.getCell(row, 11), metrics.fhea1);
    setNumber(sheet.getCell(row, 12), metrics.unionFee);
    setNumber(sheet.getCell(row, 13), metrics.hhdt);
    setNumber(sheet.getCell(row, 14), metrics.otherDeductions);
    setNumber(sheet.getCell(row, 15), metrics.totalDeductions);
    setNumber(sheet.getCell(row, 16), metrics.netPay);
    setNumber(sheet.getCell(row, 17), metrics.fhea25);
    return;
  }

  setNumber(sheet.getCell(row, 3), metrics.approvedUnits);
  setNumber(sheet.getCell(row, 4), metrics.approvedFund);
  setNumber(sheet.getCell(row, 5), metrics.decree469);
  setNumber(sheet.getCell(row, 6), metrics.vacantUnits);
  setNumber(sheet.getCell(row, 7), metrics.vacantAmount);
  setNumber(sheet.getCell(row, 8), metrics.actualUnits);
  setNumber(sheet.getCell(row, 9), metrics.actualAmount);
  setNumber(sheet.getCell(row, 10), metrics.incomeTax);
  setNumber(sheet.getCell(row, 11), metrics.fhea1);
  setNumber(sheet.getCell(row, 12), metrics.unionFee);
  setNumber(sheet.getCell(row, 13), metrics.hhdt);
  setNumber(sheet.getCell(row, 14), metrics.otherDeductions);
  setNumber(sheet.getCell(row, 15), metrics.totalDeductions);
  setNumber(sheet.getCell(row, 16), metrics.netPay);
  setNumber(sheet.getCell(row, 17), metrics.fhea25);
}

function writePaymentRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  payment: LocalPayrollRequirementDocument['paymentRows'][number]
) {
  sheet.getCell(row, 3).value = payment.article;
  setNumber(sheet.getCell(row, 4), payment.salaryPay);
  setNumber(sheet.getCell(row, 5), payment.incomeTax);
  setNumber(sheet.getCell(row, 6), payment.fhea1);
  setNumber(sheet.getCell(row, 7), payment.unionFee);
  setNumber(sheet.getCell(row, 8), payment.hhdt);
  setNumber(sheet.getCell(row, 9), payment.otherDeductions);
  setNumber(sheet.getCell(row, 10), payment.totalDeductions);
  setNumber(sheet.getCell(row, 11), payment.bankFee);
  setNumber(sheet.getCell(row, 12), payment.sanatorium15);
  setNumber(sheet.getCell(row, 13), payment.fhea25Payment);
  setNumber(sheet.getCell(row, 14), payment.totalExpense);
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
  const sheet = workbook.worksheets[0];

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
