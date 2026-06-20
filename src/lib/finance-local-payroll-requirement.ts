import {
  calcEmployerFhea25,
  calcSanatoriumFromEmployerFhea,
  roundPayrollMoney,
} from '@/lib/payroll-accounting';
import { collectSocialInsuranceBankPayments } from '@/lib/finance-social-insurance-pay';
import {
  calcEntryTotals,
  formatLedgerAmount,
  mergePayrollLedgerForMonth,
} from '@/lib/finance-payroll-ledger';
import { resolvePayrollWithholdings } from '@/lib/finance-payroll-withholdings';
import {
  isFoodSafetyCenterOrganization,
  isKindergartenOrganization,
} from '@/lib/organization-scope';
import { analyzeStaffing } from '@/lib/staff-analytics';
import { detectStaffColumns, parseAmount } from '@/lib/staff-table-calc';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent, StaffEmployee } from '@/types/organization-section';

export type LocalPayrollRequirementGroupId =
  | 'admin_teachers'
  | 'technical'
  | 'leadership_specialists'
  | 'service_staff';

export type LocalPayrollRequirementGroupConfig = {
  id: LocalPayrollRequirementGroupId;
  title: string;
  departments: readonly string[];
};

const KINDERGARTEN_LOCAL_PAYROLL_GROUPS: LocalPayrollRequirementGroupConfig[] = [
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
];

const FOOD_SAFETY_LOCAL_PAYROLL_GROUPS: LocalPayrollRequirementGroupConfig[] = [
  {
    id: 'leadership_specialists',
    title: 'РОҲБАРИКУНАНДА ВА МУТАХАССИСОН',
    departments: [
      '1. Роҳбарият',
      '2. Шуъбаи назорати байторӣ ва зотпарварӣ',
      '3. Бахши назорати фитосанитарӣ, карантинӣ ва тухмӣ',
      '4. Бахши санҷиши қонунгузории бехатарии озуқаворӣ',
      '5. Бахши муҳосибот ва кадрҳо',
    ],
  },
  {
    id: 'service_staff',
    title: 'КОРМАНДОНИ ХИЗМАТРАСОНӢ',
    departments: ['Кормандони хизматрасонӣ'],
  },
];

/** @deprecated Use getLocalPayrollRequirementGroups */
export const LOCAL_PAYROLL_REQUIREMENT_GROUPS = KINDERGARTEN_LOCAL_PAYROLL_GROUPS;

export function getLocalPayrollRequirementGroups(
  organizationId?: string
): LocalPayrollRequirementGroupConfig[] {
  if (isFoodSafetyCenterOrganization(organizationId)) {
    return FOOD_SAFETY_LOCAL_PAYROLL_GROUPS;
  }
  return KINDERGARTEN_LOCAL_PAYROLL_GROUPS;
}

export function supportsLocalPayrollRequirement(organizationId?: string): boolean {
  return (
    isKindergartenOrganization(organizationId) ||
    isFoodSafetyCenterOrganization(organizationId)
  );
}

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
  return `${TAJIK_MONTHS[index] ?? month} ${year} с.`;
}

export function formatLocalPayrollRequirementMonthLabel(monthKey: string): string {
  return formatMonthLabelTj(monthKey);
}

export function buildLocalPayrollRequirementDocumentTitle(monthLabel: string): string {
  return `Оиди ҳисоби намудани музди маош, музди маоши додамешуда, ҷойи кори холи дар моҳи ${monthLabel}`;
}
const BANK_FEE_RATE = 0.005;

function roundMoney(value: number): number {
  return roundPayrollMoney(value);
}

function normalizeDepartmentKey(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

function isTechnicalStaffDepartment(department: string): boolean {
  const key = normalizeDepartmentKey(department);
  return (
    key.includes('ЁРИРАСОН') ||
    key.includes('ХИЗМАТРАСОН') ||
    key.includes('ТЕХНИК')
  );
}

function isFoodSafetyServiceDepartment(department: string): boolean {
  const key = normalizeDepartmentKey(department);
  return key.includes('ХИЗМАТРАСОН') && !key.includes('ҲАМАГӢ');
}

function departmentBelongsToFoodSafetyGroup(
  department: string,
  groupId: LocalPayrollRequirementGroupId
): boolean {
  const key = normalizeDepartmentKey(department);
  if (!key || key.includes('ҲАМАГӢ')) return false;

  const isService = isFoodSafetyServiceDepartment(department);

  if (groupId === 'service_staff') return isService;

  if (groupId === 'leadership_specialists') {
    if (isService) return false;
    const trimmed = department.trim();
    return (
      /^\d+\./.test(trimmed) ||
      key.includes('РОҲБАР') ||
      key.includes('ШУЪБА') ||
      key.includes('БАХШ') ||
      key.includes('НАЗОРАТ') ||
      key.includes('МУТАХАССИС') ||
      key.includes('МУҲОСИБ')
    );
  }

  return false;
}

function departmentBelongsToKindergartenGroup(
  department: string,
  groupId: LocalPayrollRequirementGroupId,
  organizationId?: string
): boolean {
  const key = normalizeDepartmentKey(department);
  if (!key) return false;

  const group = KINDERGARTEN_LOCAL_PAYROLL_GROUPS.find((item) => item.id === groupId);
  if (!group) return false;

  if (group.departments.some((item) => normalizeDepartmentKey(item) === key)) {
    return true;
  }

  if (!isKindergartenOrganization(organizationId)) {
    return false;
  }

  if (group.id === 'technical') {
    return isTechnicalStaffDepartment(key);
  }

  if (isTechnicalStaffDepartment(key)) {
    return false;
  }

  return (
    key.includes('РОҲБАР') ||
    key.includes('МУРАББ') ||
    key.includes('ОМУЗГОР') ||
    key.includes('ТИББ') ||
    key.includes('ҲАМШИР')
  );
}

export function departmentBelongsToGroup(
  department: string,
  groupId: LocalPayrollRequirementGroupId,
  organizationId?: string
): boolean {
  if (isFoodSafetyCenterOrganization(organizationId)) {
    return departmentBelongsToFoodSafetyGroup(department, groupId);
  }

  return departmentBelongsToKindergartenGroup(department, groupId, organizationId);
}

function resolveEmployeeDepartment(
  employee: StaffEmployee,
  staffContent: OrganizationSectionContent
): string {
  const direct = employee.department?.trim();
  if (direct) return direct;

  const position = employee.position?.trim();
  if (!position) return '';

  for (const table of staffContent.tables ?? []) {
    const columns = detectStaffColumns(table.columns);
    if (!columns) continue;

    for (const row of table.rows) {
      if (row[columns.position]?.trim() === position) {
        return table.title;
      }
    }
  }

  return '';
}

function readFinancePayrollSourceFunds(
  financeContent: OrganizationSectionContent
): Map<string, number> {
  const funds = new Map<string, number>();

  for (const table of financeContent.tables ?? []) {
    const title = table.title.toLowerCase();
    if (!title.includes('музди') && !title.includes('манба')) continue;
    if (table.columns.length < 2) continue;

    for (const row of table.rows) {
      const label = row[0]?.trim();
      if (!label || label.toLowerCase().includes('ҷамъ')) continue;
      const amount = parseAmount(row[1]);
      if (amount === null) continue;
      funds.set(normalizeDepartmentKey(label), amount);
    }
  }

  return funds;
}

function supplementStaffMetricsFromStaffGrandTables(
  metrics: LocalPayrollRequirementGroupMetrics,
  groupId: LocalPayrollRequirementGroupId,
  staffContent: OrganizationSectionContent,
  organizationId?: string
) {
  if (metrics.approvedFund > 0) return;
  if (!isFoodSafetyCenterOrganization(organizationId)) return;

  for (const table of staffContent.tables ?? []) {
    const title = normalizeDepartmentKey(table.title);
    if (!title.includes('ҲАМАГӢ')) continue;

    const lower = table.columns.map((column) => column.toLowerCase());
    const monthlyIndex = lower.findIndex(
      (column) => column.includes('музди') && column.includes('моҳона')
    );
    if (monthlyIndex < 0 || table.rows.length === 0) continue;

    const monthlyFund = parseAmount(table.rows[0][monthlyIndex] ?? '');
    if (monthlyFund === null || monthlyFund <= 0) continue;

    if (groupId === 'leadership_specialists' && title.includes('РОҲБАРИКУНАНДА')) {
      metrics.approvedFund = roundMoney(monthlyFund);
    }
    if (groupId === 'service_staff' && title.includes('ХИЗМАТРАСОН')) {
      metrics.approvedFund = roundMoney(monthlyFund);
    }
  }
}

function supplementStaffMetricsFromFinance(
  metrics: LocalPayrollRequirementGroupMetrics,
  groupId: LocalPayrollRequirementGroupId,
  financeContent: OrganizationSectionContent,
  organizationId?: string
) {
  if (metrics.approvedFund > 0) return;

  const funds = readFinancePayrollSourceFunds(financeContent);
  if (funds.size === 0) return;

  let addedFund = 0;
  for (const [label, amount] of funds.entries()) {
    if (!departmentBelongsToGroup(label, groupId, organizationId)) continue;
    addedFund += amount;
  }

  if (addedFund > 0) {
    metrics.approvedFund = roundMoney(addedFund);
  }
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
  metrics.fhea25 = calcEmployerFhea25(metrics.actualAmount);
  metrics.bankFeeAmount = roundMoney(metrics.netPay * BANK_FEE_RATE);
}

function buildStaffMetrics(
  staffContent: OrganizationSectionContent,
  financeContent: OrganizationSectionContent,
  groupId: LocalPayrollRequirementGroupId,
  organizationId?: string,
  decree469 = 0
): LocalPayrollRequirementGroupMetrics {
  const analytics = analyzeStaffing(staffContent);
  const metrics = emptyMetrics();
  metrics.decree469 = decree469;

  for (const slot of analytics.slots) {
    if (!departmentBelongsToGroup(slot.department, groupId, organizationId)) continue;
    metrics.approvedUnits += slot.quota;
    metrics.actualUnits += slot.filled;
    metrics.vacantUnits += slot.vacant;

    const monthlyWage = parseAmount(slot.monthlyWage ?? '') ?? 0;
    const unitWage =
      slot.quota > 0 ? monthlyWage / slot.quota : parseAmount(slot.baseSalary ?? '') ?? 0;

    metrics.approvedFund += monthlyWage;
    metrics.vacantAmount += unitWage * slot.vacant;
  }

  supplementStaffMetricsFromStaffGrandTables(
    metrics,
    groupId,
    staffContent,
    organizationId
  );

  supplementStaffMetricsFromFinance(metrics, groupId, financeContent, organizationId);

  metrics.approvedUnits = roundMoney(metrics.approvedUnits);
  metrics.actualUnits = roundMoney(metrics.actualUnits);
  metrics.vacantUnits = roundMoney(metrics.vacantUnits);
  metrics.approvedFund = roundMoney(metrics.approvedFund);
  metrics.vacantAmount = roundMoney(metrics.vacantAmount);
  return metrics;
}

function buildLedgerMetrics(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  month: string,
  groupId: LocalPayrollRequirementGroupId,
  organizationId?: string
): LocalPayrollRequirementGroupMetrics {
  const ledger = mergePayrollLedgerForMonth(financeContent.payrollLedgers, month, staffContent, {
    organizationId,
    positionHandovers: financeContent.positionHandovers,
    salaryAllowanceAdjustments: financeContent.salaryAllowanceAdjustments,
    laborLeaves: financeContent.laborLeaves,
    payrollLedgers: financeContent.payrollLedgers,
    payrollWithholdingTypes: resolvePayrollWithholdings(financeContent),
    payrollWithholdingAssignments: financeContent.payrollWithholdingAssignments,
  });

  const metrics = emptyMetrics();

  for (const entry of ledger.entries) {
    const employee = staffContent.employees?.find((item) => item.id === entry.employeeId);
    if (!employee) continue;

    const department = resolveEmployeeDepartment(employee, staffContent);
    if (!departmentBelongsToGroup(department, groupId, organizationId)) continue;

    const totals = calcEntryTotals(entry, resolvePayrollWithholdings(financeContent));
    if (totals.gross > 0) {
      metrics.actualUnits += 1;
    }
    metrics.actualAmount += totals.gross;
    metrics.incomeTax += totals.tax;
    metrics.fhea1 += totals.fhea;
    metrics.unionFee += totals.kik;
    metrics.hhdt += totals.hhdt;
    metrics.otherDeductions += totals.otherDeductions;
    metrics.totalDeductions += totals.deductions;
    metrics.netPay += totals.netPay;
  }

  metrics.actualUnits = roundMoney(metrics.actualUnits);
  return metrics;
}

function buildGroup(
  group: LocalPayrollRequirementGroupConfig,
  staffContent: OrganizationSectionContent,
  financeContent: OrganizationSectionContent,
  month: string,
  organizationId?: string,
  decree469 = 0
): LocalPayrollRequirementGroup {
  const staffMetrics = buildStaffMetrics(
    staffContent,
    financeContent,
    group.id,
    organizationId,
    decree469
  );
  const ledgerMetrics = buildLedgerMetrics(
    financeContent,
    staffContent,
    month,
    group.id,
    organizationId
  );

  const employees: LocalPayrollRequirementGroupMetrics = {
    ...staffMetrics,
    actualUnits:
      ledgerMetrics.actualUnits > 0 ? ledgerMetrics.actualUnits : staffMetrics.actualUnits,
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
    fhea25: roundMoney(
      calcEmployerFhea25(employees.actualAmount + employees.bankFeeAmount) - employees.fhea25
    ),
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

export function calcSocialInsuranceArticle2121Amount(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  month: string
): number {
  const payments = collectSocialInsuranceBankPayments(
    financeContent.laborLeaves,
    staffContent,
    financeContent.payrollLedgers,
    month
  );
  return roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
}

export function readBudgetArticle2121Amount(
  financeContent: OrganizationSectionContent,
  month: string,
  staffContent?: OrganizationSectionContent | null
): number {
  const saved = financeContent.localPayrollRequirementSettings?.find((item) => item.month === month);
  const savedRaw = saved?.budgetArticle2121Amount?.trim();
  if (savedRaw) {
    const parsed = parseAmount(savedRaw);
    if (parsed !== null) return parsed;
  }
  if (!staffContent) return 0;
  return calcSocialInsuranceArticle2121Amount(financeContent, staffContent, month);
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

  const groups = getLocalPayrollRequirementGroups(organization?.id).map((group) =>
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

  const budgetArticle2121Amount = readBudgetArticle2121Amount(
    financeContent,
    month,
    staffContent
  );

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
  const payment2121Sanatorium = calcSanatoriumFromEmployerFhea(fhea25Total);
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

export function hasLocalPayrollRequirementData(
  document: LocalPayrollRequirementDocument | null | undefined
): boolean {
  if (!document) return false;
  return (
    document.grandTotal.approvedFund > 0 ||
    document.grandTotal.actualAmount > 0 ||
    document.grandTotal.netPay > 0
  );
}
