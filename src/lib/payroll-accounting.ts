/**
 * Хулосаи китоби музди меҳнат (намоиши ФҲИА 25%, санатория ва ғ.).
 */

import {
  calcEntryTotals,
  formatLedgerAmount,
  parseLedgerAmount,
  removePayrollLedger,
  syncPayrollLedgersAfterTimesheetChange,
  upsertPayrollLedger,
  type PayrollLedgerBuildContext,
} from '@/lib/finance-payroll-ledger';
import { resolvePayrollWithholdings } from '@/lib/finance-payroll-withholdings';
import {
  OrganizationSectionContent,
  PayrollLedger,
  PayrollWithholdingType,
} from '@/types/organization-section';

/** Андози иҷтимоӣ аз корманд (ФҲИА 1%) */
export const PAYROLL_FHEA_EMPLOYEE_RATE = 0.01;
/** Аъзоҳаққии иттифоқи касаба (КИК) */
export const PAYROLL_UNION_FEE_RATE = 0.01;
/** Ҳифзи ҳуқуқи дастрасии тиббӣ (ҲҲДТ) */
export const PAYROLL_HHDT_RATE = 0.01;
/** Андози иҷтимоӣ аз корфармо (ФҲИА 25%) */
export const PAYROLL_EMPLOYER_FHEA_RATE = 0.25;
/** Санаторияи истирохатӣ — 1,5% аз маблағи ФҲИА 25% */
export const PAYROLL_SANATORIUM_RATE = 0.015;

export type PayrollLedgerSummary = {
  month: string;
  gross: number;
  fheaEmployee: number;
  unionFee: number;
  hhdt: number;
  otherDeductions: number;
  incomeTax: number;
  netPay: number;
  employerFhea25: number;
  sanatorium15: number;
};

export function roundPayrollMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calcEmployerFhea25(gross: number): number {
  return roundPayrollMoney(gross * PAYROLL_EMPLOYER_FHEA_RATE);
}

export function calcSanatoriumFromEmployerFhea(employerFhea25: number): number {
  return roundPayrollMoney(employerFhea25 * PAYROLL_SANATORIUM_RATE);
}

export function summarizePayrollLedger(
  ledger: PayrollLedger,
  withholdingTypes: PayrollWithholdingType[] = []
): PayrollLedgerSummary {
  let gross = 0;
  let fheaEmployee = 0;
  let unionFee = 0;
  let hhdt = 0;
  let otherDeductions = 0;
  let incomeTax = 0;
  let netPay = 0;

  for (const entry of ledger.entries) {
    const totals = calcEntryTotals(entry, withholdingTypes);
    gross += totals.gross;
    fheaEmployee += totals.fhea;
    unionFee += totals.kik;
    hhdt += totals.hhdt;
    otherDeductions += totals.otherDeductions;
    incomeTax += totals.tax;
    netPay += totals.netPay;
  }

  const employerFhea25 = calcEmployerFhea25(gross);
  const sanatorium15 = calcSanatoriumFromEmployerFhea(employerFhea25);

  return {
    month: ledger.month,
    gross: roundPayrollMoney(gross),
    fheaEmployee: roundPayrollMoney(fheaEmployee),
    unionFee: roundPayrollMoney(unionFee),
    hhdt: roundPayrollMoney(hhdt),
    otherDeductions: roundPayrollMoney(otherDeductions),
    incomeTax: roundPayrollMoney(incomeTax),
    netPay: roundPayrollMoney(netPay),
    employerFhea25,
    sanatorium15,
  };
}

export function formatPayrollSummaryAmount(value: number): string {
  return formatLedgerAmount(value);
}

export function parsePayrollSummaryAmount(value: string): number {
  return parseLedgerAmount(value);
}

export type PayrollLedgerPersistResult = {
  content: OrganizationSectionContent;
  postedCount: number;
  postingErrors: string[];
};

/** Сабти китоби музди меҳнат */
export function persistPayrollLedgerInFinance(
  financeContent: OrganizationSectionContent,
  ledger: PayrollLedger
): PayrollLedgerPersistResult {
  return {
    content: {
      ...financeContent,
      payrollLedgers: upsertPayrollLedger(financeContent.payrollLedgers, ledger),
    },
    postedCount: 0,
    postingErrors: [],
  };
}

/** Пас аз тағйири рухсат — мунтазир намон, мазмуни молия бе тағйири иловагӣ бармегардад */
export function persistLaborLeaveInFinance(
  financeContent: OrganizationSectionContent,
  _staffContent?: OrganizationSectionContent | null,
  _organizationId?: string
): OrganizationSectionContent {
  return financeContent;
}

/** Навсозии китоб пас аз тағйири табел */
export function applyPayrollLedgerTimesheetSync(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  months: string[],
  context: PayrollLedgerBuildContext = {}
): OrganizationSectionContent {
  return {
    ...financeContent,
    payrollLedgers: syncPayrollLedgersAfterTimesheetChange(
      financeContent.payrollLedgers,
      staffContent,
      months,
      context
    ),
  };
}

/** Нест кардани китоби музди меҳнат барои моҳ */
export function removePayrollLedgerInFinance(
  financeContent: OrganizationSectionContent,
  month: string,
  _organizationId?: string
): OrganizationSectionContent {
  return {
    ...financeContent,
    payrollLedgers: removePayrollLedger(financeContent.payrollLedgers, month),
  };
}
