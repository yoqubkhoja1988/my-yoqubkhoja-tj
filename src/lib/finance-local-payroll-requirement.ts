import {
  calcEntryTotals,
  formatLedgerAmount,
  mergePayrollLedgerForMonth,
} from '@/lib/finance-payroll-ledger';
import { analyzeStaffing } from '@/lib/staff-analytics';
import { parseAmount } from '@/lib/staff-table-calc';
import { activeEmployees } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';

export const LOCAL_PAYROLL_REQUIREMENT_GROUPS = [
  {
    id: 'admin_teachers',
    title: 'МАЪМУРИЯТ ВА ОМУЗГОРОН',
    departments: ['РОҲБАРИЯТ', 'МУРАББИЯ', 'ҲАМШИРАҲОИ ТИББӢ'],
  },
  {
    id: 'technical',
    title: 'КОРМАНДОНИ ҲАЙАТИ ТЕХНИКӢ',
    departments: ['КОРМАНДОНИ ЁРИРАСОН', 'КОРМАНДОНИ ЁРИРАСОН (ТЕХНИКӢ)'],
  },
] as const;

export type LocalPayrollRequirementGroupId =
  (typeof LOCAL_PAYROLL_REQUIREMENT_GROUPS)[number]['id'];

export type LocalPayrollRequirementGroupRow = {
  rowNo: number;
  label: string;
  isBankFee?: boolean;
  isSubtotal?: boolean;
};

export type LocalPayrollRequirementGroupMetrics = {
  approvedUnits: number;
  approvedFund: number;
  decree469: number;
  vacantUnits: number;
  vacantAmount: number;
  actualUnits: number;
  actualAmount: number;
  incomeTax: number;
  fhea1: number;
  unionFee: number;
  hhdt: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  fhea25: number;
  bankFeeAmount: number;
};

export type LocalPayrollRequirementGroup = {
  id: LocalPayrollRequirementGroupId;
  title: string;
  rows: LocalPayrollRequirementGroupRow[];
  employees: LocalPayrollRequirementGroupMetrics;
  bankFee: Pick<LocalPayrollRequirementGroupMetrics, 'actualAmount' | 'fhea25'>;
  subtotal: LocalPayrollRequirementGroupMetrics;
};

export type LocalPayrollRequirementPaymentRow = {
  article: string;
  salaryPay: number;
  incomeTax: number;
  fhea1: number;
  unionFee: number;
  hhdt: number;
  otherDeductions: number;
  totalDeductions: number;
  bankFee: number;
  sanatorium15: number;
  fhea25Payment: number;
  totalExpense: number;
};

export type LocalPayrollRequirementDocument = {
  month: string;
  monthLabel: string;
  organizationName: string;
  preparedAt: string;
  groups: LocalPayrollRequirementGroup[];
  grandTotal: LocalPayrollRequirementGroupMetrics;
  paymentRows: LocalPayrollRequirementPaymentRow[];
  paymentTotal: LocalPayrollRequirementPaymentRow;
  budgetArticle2121Amount: number;
  directorName: string;
  accountantName: string;
};

const TAJIK_MONTHS = [
  'январ', 'феврал', 'март', 'апрел', 'май', 'июн',
  'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр',
] as const;

function formatMonthLabelTj(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const index = Number.parseInt(month ?? '1', 10) - 1;
  return `${TAJIK_MONTHS[index] ?? month} ${year}`;
}
const BANK_FEE_RATE = 0.005;
const FHEA_EMPLOYER_RATE = 0.25;
const SANATORIUM_RATE = 0.015;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyMetrics(): LocalPayrollRequirementGroupMetrics {
  return {
    approvedUnits: 0,
    approvedFund: 0,
    decree469: 0,
    vacantUnits: 0,
    vacantAmount: 0,
    actualUnits: 0,
    actualAmount: 0,
    incomeTax: 0,
    fhea1: 0,
    unionFee: 0,
    hhdt: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    netPay: 0,
    fhea25: 0,
    bankFeeAmount: 0,
  };
}

function addMetrics(
  target: LocalPayrollRequirementGroupMetrics,
  source: LocalPayrollRequirementGroupMetrics
) {
  target.approvedUnits += source.approvedUnits;
  target.approvedFund += source.approvedFund;
  target.decree469 += source.decree469;
  target.vacantUnits += source.vacantUnits;
  target.vacantAmount += source.vacantAmount;
  target.actualUnits += source.actualUnits;
  target.actualAmount += source.actualAmount;
  target.incomeTax += source.incomeTax;
  target.fhea1 += source.fhea1;
  target.unionFee += source.unionFee;
  target.hhdt += source.hhdt;
  target.otherDeductions += source.otherDeductions;
  target.totalDeductions += source.totalDeductions;
  target.netPay += source.netPay;
  target.fhea25 += source.fhea25;
  target.bankFeeAmount += source.bankFeeAmount;
}

function finalizeGroupMetrics(metrics: LocalPayrollRequirementGroupMetrics) {
  metrics.approvedFund = roundMoney(metrics.approvedFund);
  metrics.decree469 = roundMoney(metrics.decree469);
  metrics.vacantAmount = roundMoney(metrics.vacantAmount);
  metrics.actualAmount = roundMoney(metrics.actualAmount);
  metrics.incomeTax = roundMoney(metrics.incomeTax);
  metrics.fhea1 = roundMoney(metrics.fhea1);
  metrics.unionFee = roundMoney(metrics.unionFee);
  metrics.hhdt = roundMoney(metrics.hhdt);
  metrics.otherDeductions = roundMoney(metrics.otherDeductions);
  metrics.totalDeductions = roundMoney(metrics.totalDeductions);
  metrics.netPay = roundMoney(metrics.netPay);
  metrics.fhea25 = roundMoney(metrics.actualAmount * FHEA_EMPLOYER_RATE);
  metrics.bankFeeAmount = roundMoney(metrics.netPay * BANK_FEE_RATE);
}

function buildStaffMetrics(
  staffContent: OrganizationSectionContent,
  departments: readonly string[],
  decree469 = 0
): LocalPayrollRequirementGroupMetrics {
  const analytics = analyzeStaffing(staffContent);
  const metrics = emptyMetrics();
  metrics.decree469 = decree469;

  for (const slot of analytics.slots) {
    if (!departments.includes(slot.department)) continue;
    metrics.approvedUnits += slot.quota;
    metrics.actualUnits += slot.filled;
    metrics.vacantUnits += slot.vacant;

    const monthlyWage = parseAmount(slot.monthlyWage ?? '') ?? 0;
    const unitWage =
      slot.quota > 0 ? monthlyWage / slot.quota : parseAmount(slot.baseSalary ?? '') ?? 0;

    metrics.approvedFund += monthlyWage;
    metrics.vacantAmount += unitWage * slot.vacant;
  }

  metrics.approvedUnits = roundMoney(metrics.approvedUnits);
  metrics.actualUnits = roundMoney(metrics.actualUnits);
  metrics.vacantUnits = roundMoney(metrics.vacantUnits);
  return metrics;
}

function buildLedgerMetrics(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  month: string,
  departments: readonly string[],
  organizationId?: string
): LocalPayrollRequirementGroupMetrics {
  const ledger = mergePayrollLedgerForMonth(financeContent.payrollLedgers, month, staffContent, {
    organizationId,
    positionHandovers: financeContent.positionHandovers,
    laborLeaves: financeContent.laborLeaves,
    payrollLedgers: financeContent.payrollLedgers,
  });

  const employeeMap = new Map(activeEmployees(staffContent.employees).map((item) => [item.id, item]));
  const metrics = emptyMetrics();

  for (const entry of ledger.entries) {
    const employee = employeeMap.get(entry.employeeId);
    if (!employee?.department || !departments.includes(employee.department)) continue;

    const totals = calcEntryTotals(entry);
    metrics.actualAmount += totals.gross;
    metrics.incomeTax += totals.tax;
    metrics.fhea1 += totals.fhea;
    metrics.unionFee += totals.kik;
    metrics.hhdt += totals.hhdt;
    metrics.totalDeductions += totals.deductions;
    metrics.netPay += totals.netPay;
  }

  return metrics;
}

function buildGroup(
  group: (typeof LOCAL_PAYROLL_REQUIREMENT_GROUPS)[number],
  staffContent: OrganizationSectionContent,
  financeContent: OrganizationSectionContent,
  month: string,
  organizationId?: string,
  decree469 = 0
): LocalPayrollRequirementGroup {
  const staffMetrics = buildStaffMetrics(staffContent, group.departments, decree469);
  const ledgerMetrics = buildLedgerMetrics(
    financeContent,
    staffContent,
    month,
    group.departments,
    organizationId
  );

  const employees: LocalPayrollRequirementGroupMetrics = {
    ...staffMetrics,
    actualAmount: ledgerMetrics.actualAmount,
    incomeTax: ledgerMetrics.incomeTax,
    fhea1: ledgerMetrics.fhea1,
    unionFee: ledgerMetrics.unionFee,
    hhdt: ledgerMetrics.hhdt,
    otherDeductions: 0,
    totalDeductions: ledgerMetrics.totalDeductions,
    netPay: ledgerMetrics.netPay,
    fhea25: 0,
    bankFeeAmount: 0,
  };
  finalizeGroupMetrics(employees);

  const bankFee = {
    actualAmount: employees.bankFeeAmount,
    fhea25: roundMoney((employees.actualAmount + employees.bankFeeAmount) * FHEA_EMPLOYER_RATE - employees.fhea25),
  };

  const subtotal: LocalPayrollRequirementGroupMetrics = {
    ...employees,
    actualAmount: roundMoney(employees.actualAmount + employees.bankFeeAmount),
    fhea25: roundMoney(employees.fhea25 + bankFee.fhea25),
  };

  return {
    id: group.id,
    title: group.title,
    rows: [
      { rowNo: 1, label: 'Ҳамагӣ кормандон' },
      { rowNo: 2, label: 'Хизмати бонк-0,5%', isBankFee: true },
      { rowNo: 0, label: 'ЧАМЪ:', isSubtotal: true },
    ],
    employees,
    bankFee,
    subtotal,
  };
}

export function resolveLocalPayrollRequirementMonth(
  financeContent: OrganizationSectionContent,
  preferredMonth?: string | null
): string {
  if (preferredMonth) return preferredMonth;
  const months = (financeContent.payrollLedgers ?? []).map((item) => item.month).sort().reverse();
  return months[0] ?? new Date().toISOString().slice(0, 7);
}

export function readBudgetArticle2121Amount(
  financeContent: OrganizationSectionContent,
  month: string
): number {
  const saved = financeContent.localPayrollRequirementSettings?.find((item) => item.month === month);
  return parseAmount(saved?.budgetArticle2121Amount ?? '') ?? 0;
}

export function buildLocalPayrollRequirementDocument(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  month: string,
  organization?: Organization,
  reportOrganizationName?: string
): LocalPayrollRequirementDocument | null {
  if (!staffContent) return null;

  const settings = financeContent.localPayrollRequirementSettings?.find((item) => item.month === month);
  const decree469ByGroup = settings?.decree469ByGroup ?? {};

  const groups = LOCAL_PAYROLL_REQUIREMENT_GROUPS.map((group) =>
    buildGroup(
      group,
      staffContent,
      financeContent,
      month,
      organization?.id,
      parseAmount(decree469ByGroup[group.id] ?? '') ?? 0
    )
  );

  const grandTotal = emptyMetrics();
  for (const group of groups) {
    addMetrics(grandTotal, group.subtotal);
  }
  finalizeGroupMetrics(grandTotal);

  const budgetArticle2121Amount =
    parseAmount(settings?.budgetArticle2121Amount ?? '') ?? 78;

  const payment2111: LocalPayrollRequirementPaymentRow = {
    article: '2111',
    salaryPay: grandTotal.netPay,
    incomeTax: grandTotal.incomeTax,
    fhea1: grandTotal.fhea1,
    unionFee: grandTotal.unionFee,
    hhdt: grandTotal.hhdt,
    otherDeductions: grandTotal.otherDeductions,
    totalDeductions: grandTotal.totalDeductions,
    bankFee: roundMoney(groups.reduce((sum, group) => sum + group.employees.bankFeeAmount, 0)),
    sanatorium15: 0,
    fhea25Payment: 0,
    totalExpense: roundMoney(grandTotal.actualAmount),
  };

  const fhea25Total = grandTotal.fhea25;
  const payment2121Bank = roundMoney(budgetArticle2121Amount * BANK_FEE_RATE);
  const payment2121Sanatorium = roundMoney(fhea25Total * SANATORIUM_RATE);
  const payment2121Fhea = roundMoney(
    fhea25Total - payment2121Sanatorium - payment2121Bank - budgetArticle2121Amount
  );

  const payment2121: LocalPayrollRequirementPaymentRow = {
    article: '2121',
    salaryPay: budgetArticle2121Amount,
    incomeTax: 0,
    fhea1: 0,
    unionFee: 0,
    hhdt: 0,
    otherDeductions: 0,
    totalDeductions: 0,
    bankFee: payment2121Bank,
    sanatorium15: payment2121Sanatorium,
    fhea25Payment: payment2121Fhea,
    totalExpense: roundMoney(
      budgetArticle2121Amount +
        payment2121Bank +
        payment2121Sanatorium +
        payment2121Fhea
    ),
  };

  const paymentTotal: LocalPayrollRequirementPaymentRow = {
    article: 'Ҳамагӣ',
    salaryPay: roundMoney(payment2111.salaryPay + payment2121.salaryPay),
    incomeTax: payment2111.incomeTax,
    fhea1: payment2111.fhea1,
    unionFee: payment2111.unionFee,
    hhdt: payment2111.hhdt,
    otherDeductions: payment2111.otherDeductions,
    totalDeductions: payment2111.totalDeductions,
    bankFee: roundMoney(payment2111.bankFee + payment2121.bankFee),
    sanatorium15: payment2121.sanatorium15,
    fhea25Payment: payment2121.fhea25Payment,
    totalExpense: roundMoney(payment2111.totalExpense + payment2121.totalExpense),
  };

  return {
    month,
    monthLabel: formatMonthLabelTj(month),
    organizationName: reportOrganizationName?.trim() || organization?.name || '',
    preparedAt: new Date().toISOString().slice(0, 10),
    groups,
    grandTotal,
    paymentRows: [payment2111, payment2121],
    paymentTotal,
    budgetArticle2121Amount,
    directorName: organization?.director ?? '',
    accountantName: organization?.chiefAccountant ?? '',
  };
}

export function formatRequirementAmount(value: number): string {
  return formatLedgerAmount(value);
}
