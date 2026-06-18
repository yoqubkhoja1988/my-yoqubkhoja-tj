import {
  detectStaffColumns,
  formatAmount,
  isTotalRow,
  parseAmount,
} from '@/lib/staff-table-calc';
import {
  activeEmployees,
  countNormWorkingDays,
  countPayrollWorkedDays,
  currentMonthKey,
  getDaysInMonth,
  mergeTimesheetForMonth,
  resolveTimesheetMark,
} from '@/lib/staff-timesheet';
import {
  hydrateWageScale,
  parseWageAmount,
  usesPreschoolWageScales,
} from '@/lib/preschool-wage-scales';
import { laborLeavePayForEmployee } from '@/lib/finance-labor-leave-pay';
import { allowanceAdjustmentForEmployee } from '@/lib/finance-allowance-calc';
import {
  EmploymentWorkType,
  LaborLeave,
  OrganizationSectionContent,
  PayrollLedger,
  PayrollLedgerEntry,
  PositionHandover,
  SalaryAllowanceAdjustment,
  StaffEmployee,
  StaffTimesheetEntry,
} from '@/types/organization-section';

const ZERO = '0,00';
const PRIMARY_TAX_RATE = 0.12;
const SECONDARY_TAX_RATE = 0.15;
const TAX_SOCIAL_PERCENT = 0.01;
const TAX_STANDARD_DEDUCTION = 156;

export function resolveEmploymentWorkType(
  employee: Pick<StaffEmployee, 'employmentWorkType'>
): EmploymentWorkType {
  return employee.employmentWorkType === 'secondary' ? 'secondary' : 'primary';
}

/** Normalize full name for grouping the same person across multiple position records. */
export function normalizeEmployeeFullName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Group key for payroll ledger display rows.
 * Multi-position employees get separate staff records (and tab numbers) — identity is by
 * tax/bank id when present, otherwise normalized full name.
 */
export function payrollLedgerPersonGroupKey(employee: StaffEmployee): string {
  const ris = employee.ris?.trim();
  if (ris) return `ris:${ris.toLowerCase()}`;

  const rma = employee.rma?.trim();
  if (rma) return `rma:${rma.toLowerCase()}`;

  const bankAccount = employee.bankAccount?.replace(/\D/g, '');
  if (bankAccount) return `bank:${bankAccount}`;

  return `name:${normalizeEmployeeFullName(employee.fullName)}`;
}

/** Кори асосӣ: (Ҳамагӣ − 1% − 156) × 12% */
export function calcPrimaryIncomeTax(
  gross: number,
  workedDays?: number,
  normDays?: number
): number {
  const standardDeduction =
    workedDays !== undefined && normDays !== undefined && normDays > 0
      ? (TAX_STANDARD_DEDUCTION * workedDays) / normDays
      : TAX_STANDARD_DEDUCTION;
  const taxable = Math.max(
    0,
    gross - gross * TAX_SOCIAL_PERCENT - standardDeduction
  );
  return taxable * PRIMARY_TAX_RATE;
}

/** Кори иловагӣ: (Ҳамагӣ − 1%) × 15% */
export function calcSecondaryIncomeTax(gross: number): number {
  const taxable = Math.max(0, gross - gross * TAX_SOCIAL_PERCENT);
  return taxable * SECONDARY_TAX_RATE;
}

export function calcIncomeTax(
  gross: number,
  workedDays?: number,
  normDays?: number,
  workType: EmploymentWorkType = 'primary'
): number {
  if (workType === 'secondary') {
    return calcSecondaryIncomeTax(gross);
  }
  return calcPrimaryIncomeTax(gross, workedDays, normDays);
}


export function formatLedgerAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseLedgerAmount(value: string): number {
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normWorkingDays(month: string): number {
  return countNormWorkingDays(month);
}

function proportional(part: number, worked: number, norm: number): number {
  if (norm <= 0) return 0;
  return worked >= norm ? part : (part * worked) / norm;
}

function handoverStartDay(effectiveDate: string, month: string): number | null {
  if (effectiveDate.slice(0, 7) !== month) return null;
  const day = Number.parseInt(effectiveDate.slice(8, 10), 10);
  return Number.isFinite(day) && day >= 1 ? day : null;
}

function workedHandoverDays(
  entry: StaffTimesheetEntry,
  month: string,
  startDay: number
): number {
  const daysInMonth = getDaysInMonth(month);
  let count = 0;
  for (let day = startDay; day <= daysInMonth; day++) {
    if (resolveTimesheetMark(entry, month, day) === '8') count++;
  }
  return count;
}

export type HandoverAllowanceBreakdown = {
  fullMonthAllowance: number;
  workedDays: number;
  normDays: number;
  allowance: number;
};

export function calcHandoverAllowanceBreakdown(
  handover: PositionHandover,
  staffContent: OrganizationSectionContent,
  month: string,
  employeeId: string
): HandoverAllowanceBreakdown | null {
  const percent = Number(handover.salaryHandoverPercent ?? 0);
  if (percent <= 0) return null;
  if (handover.effectiveDate.slice(0, 7) !== month) return null;
  if (!handover.department || !handover.position) return null;

  const wage = findPositionDutySalary(
    staffContent,
    handover.department,
    handover.position
  );
  if (!wage) return null;

  const startDay = handoverStartDay(handover.effectiveDate, month);
  if (!startDay) return null;

  const normDays = normWorkingDays(month);
  if (normDays <= 0) return null;

  const timesheet = mergeTimesheetForMonth(
    staffContent.timesheets,
    month,
    staffContent.employees ?? []
  );
  const entry = timesheet.entries.find((item) => item.employeeId === employeeId);
  const workedDays = entry ? workedHandoverDays(entry, month, startDay) : 0;
  const fullMonthAllowance = wage.dutySalary * (percent / 100);
  const allowance = proportional(fullMonthAllowance, workedDays, normDays);

  return {
    fullMonthAllowance,
    workedDays,
    normDays,
    allowance,
  };
}

/** Маоши вазифавии моҳона аз басти вазифаҳо (барои кормандони хизматрасонӣ — бо иловапулии шабона) */
export function getEmployeeDutySalary(
  staffContent: OrganizationSectionContent,
  department: string,
  position: string
): number | null {
  const wage = findPositionDutySalary(staffContent, department, position);
  if (!wage) return null;
  if (isServiceStaffDepartment(department)) {
    return wage.dutySalary + wage.nightAllowance;
  }
  return wage.dutySalary;
}

export function findPositionDutySalary(
  staffContent: OrganizationSectionContent,
  department: string,
  position: string
): { dutySalary: number; nightAllowance: number } | null {
  for (const table of staffContent.tables ?? []) {
    if (table.title !== department) continue;
    const columns = detectStaffColumns(table.columns);
    if (!columns) continue;

    for (const row of table.rows) {
      if (isTotalRow(row, columns.position)) continue;
      if (row[columns.position]?.trim() !== position) continue;

      const baseSalary = parseAmount(row[columns.baseSalary]);
      const dutySalary = baseSalary ?? 0;

      const harmfulAmount =
        columns.harmfulAmount >= 0
          ? (parseAmount(row[columns.harmfulAmount]) ?? 0)
          : 0;
      const nightAllowance =
        columns.nightAllowance >= 0
          ? (parseAmount(row[columns.nightAllowance]) ?? 0)
          : 0;

      return {
        dutySalary: dutySalary + harmfulAmount,
        nightAllowance,
      };
    }
  }
  return null;
}

function isServiceStaffDepartment(department: string): boolean {
  return department.toLowerCase().includes('хизматрасон');
}

function findEmployeeWage(
  staffContent: OrganizationSectionContent,
  employee: StaffEmployee,
  organizationId?: string
) {
  if (organizationId && usesPreschoolWageScales(organizationId)) {
    const scale = hydrateWageScale(employee.wageScale, organizationId, employee.position);
    const monthly = parseWageAmount(scale.calculatedMonthly);
    if (monthly !== null) {
      return { baseSalary: monthly, allowances: 0 };
    }
    const parsed = parseWageAmount(scale.baseSalary);
    if (parsed !== null) {
      return { baseSalary: parsed, allowances: 0 };
    }
  }

  const scaleMonthly = employee.wageScale?.baseSalary ?? employee.wageScale?.calculatedMonthly;
  if (scaleMonthly) {
    const parsed = parseWageAmount(scaleMonthly);
    if (parsed !== null) {
      return { baseSalary: parsed, allowances: 0 };
    }
  }

  if (!employee.department || !employee.position) return null;
  const wage = findPositionDutySalary(
    staffContent,
    employee.department,
    employee.position
  );
  if (!wage) return null;

  // Кормандони хизматрасонӣ: иловапулиҳо аз басти вазифаҳо → сутуни маоши вазифавӣ
  if (isServiceStaffDepartment(employee.department)) {
    return {
      baseSalary: wage.dutySalary + wage.nightAllowance,
      allowances: 0,
    };
  }

  return {
    baseSalary: wage.dutySalary,
    allowances: wage.nightAllowance,
  };
}

export function calcHandoverAllowanceAmount(
  handover: PositionHandover,
  staffContent: OrganizationSectionContent,
  month: string,
  employeeId: string
): number {
  return (
    calcHandoverAllowanceBreakdown(handover, staffContent, month, employeeId)
      ?.allowance ?? 0
  );
}

function handoverAllowanceForEmployee(
  positionHandovers: PositionHandover[] | undefined,
  staffContent: OrganizationSectionContent,
  month: string,
  employeeId: string
): number {
  return (positionHandovers ?? []).reduce((sum, handover) => {
    if (handover.toEmployeeId !== employeeId) return sum;
    return sum + calcHandoverAllowanceAmount(handover, staffContent, month, employeeId);
  }, 0);
}

export function resolvePayrollLedgerMonth(
  financeContent: OrganizationSectionContent,
  fallback = currentMonthKey()
): string {
  const months = new Set<string>();

  for (const handover of financeContent.positionHandovers ?? []) {
    if (Number(handover.salaryHandoverPercent ?? 0) > 0) {
      months.add(handover.effectiveDate.slice(0, 7));
    }
  }

  for (const adjustment of financeContent.salaryAllowanceAdjustments ?? []) {
    months.add(adjustment.paymentMonth || adjustment.effectiveDate.slice(0, 7));
  }

  for (const leave of financeContent.laborLeaves ?? []) {
    months.add(leave.startDate.slice(0, 7));
  }

  for (const ledger of financeContent.payrollLedgers ?? []) {
    months.add(ledger.month);
  }

  if (months.has(fallback)) return fallback;

  const sorted = [...months].sort().reverse();
  return sorted[0] ?? fallback;
}

function emptyEntry(employeeId: string): PayrollLedgerEntry {
  return {
    employeeId,
    baseSalary: ZERO,
    allowances: ZERO,
    laborLeavePay: ZERO,
    fhea: ZERO,
    kik: ZERO,
    hhdt: ZERO,
    otherDeductions: ZERO,
    tax: ZERO,
  };
}

export function calcEntryTotals(entry: PayrollLedgerEntry) {
  const baseSalary = parseAmount(entry.baseSalary) ?? 0;
  const allowances = parseAmount(entry.allowances) ?? 0;
  const laborLeavePay = parseAmount(entry.laborLeavePay ?? '') ?? 0;
  const gross = baseSalary + allowances + laborLeavePay;
  const fhea = parseAmount(entry.fhea) ?? 0;
  const kik = parseAmount(entry.kik) ?? 0;
  const hhdt = parseAmount(entry.hhdt) ?? 0;
  const otherDeductions = parseAmount(entry.otherDeductions ?? '') ?? 0;
  const tax = parseAmount(entry.tax) ?? 0;
  const deductions = fhea + kik + hhdt + otherDeductions + tax;

  return {
    baseSalary,
    allowances,
    laborLeavePay,
    gross,
    fhea,
    kik,
    hhdt,
    otherDeductions,
    tax,
    deductions,
    netPay: Math.max(0, gross - deductions),
  };
}

function autoDeductions(
  gross: number,
  saved: PayrollLedgerEntry | undefined,
  workedDays: number | undefined,
  normDays: number | undefined,
  workType: EmploymentWorkType
) {
  const defaultFhea = gross * 0.01;
  const defaultKik = gross * 0.01;
  const defaultHhdt = gross * 0.01;
  const fhea =
    saved && saved.fhea !== ZERO
      ? (parseAmount(saved.fhea) ?? defaultFhea)
      : defaultFhea;
  const kik =
    saved && saved.kik !== ZERO ? (parseAmount(saved.kik) ?? defaultKik) : defaultKik;
  const hhdt =
    saved && saved.hhdt !== ZERO ? (parseAmount(saved.hhdt) ?? defaultHhdt) : defaultHhdt;
  const tax =
    saved && saved.tax !== ZERO
      ? (parseAmount(saved.tax) ?? calcIncomeTax(gross, workedDays, normDays, workType))
      : calcIncomeTax(gross, workedDays, normDays, workType);

  return {
    fhea: formatAmount(fhea),
    kik: formatAmount(kik),
    hhdt: formatAmount(hhdt),
    tax: formatAmount(tax),
  };
}

export function buildLedgerEntry(
  employee: StaffEmployee,
  staffContent: OrganizationSectionContent,
  month: string,
  saved?: PayrollLedgerEntry,
  positionHandovers?: PositionHandover[],
  laborLeaves?: LaborLeave[],
  payrollLedgers?: PayrollLedger[],
  organizationId?: string,
  salaryAllowanceAdjustments?: SalaryAllowanceAdjustment[]
): PayrollLedgerEntry {
  const timesheet = mergeTimesheetForMonth(
    staffContent.timesheets,
    month,
    staffContent.employees ?? []
  );
  const sheetEntry = timesheet.entries.find((item) => item.employeeId === employee.id);
  const workedDays = sheetEntry
    ? countPayrollWorkedDays(sheetEntry, month, {
        laborLeaves,
        employeeId: employee.id,
      })
    : 0;
  const normDays = normWorkingDays(month);
  const wage = findEmployeeWage(staffContent, employee, organizationId);
  const base = saved ?? emptyEntry(employee.id);
  const workType = resolveEmploymentWorkType(employee);
  const handoverAllowance = handoverAllowanceForEmployee(
    positionHandovers,
    staffContent,
    month,
    employee.id
  );
  const retroAllowance = allowanceAdjustmentForEmployee(
    salaryAllowanceAdjustments,
    staffContent,
    month,
    employee.id,
    organizationId,
    laborLeaves
  );
  const laborLeavePay = laborLeavePayForEmployee(
    laborLeaves,
    staffContent,
    payrollLedgers,
    month,
    employee.id
  );

  if (!wage) {
    if (handoverAllowance <= 0 && retroAllowance <= 0 && laborLeavePay <= 0) return base;

    const gross = handoverAllowance + retroAllowance + laborLeavePay;
    const deductions = autoDeductions(gross, saved, workedDays, normDays, workType);
    return {
      employeeId: employee.id,
      baseSalary: ZERO,
      allowances: formatAmount(handoverAllowance + retroAllowance),
      laborLeavePay: formatAmount(laborLeavePay),
      ...deductions,
    };
  }

  const baseSalary = proportional(wage.baseSalary, workedDays, normDays);
  const nightAllowance = proportional(wage.allowances, workedDays, normDays);
  const allowances = nightAllowance + handoverAllowance + retroAllowance;
  const gross = baseSalary + allowances + laborLeavePay;
  const deductions = autoDeductions(gross, saved, workedDays, normDays, workType);

  return {
    employeeId: employee.id,
    baseSalary: formatAmount(baseSalary),
    allowances: formatAmount(allowances),
    laborLeavePay: formatAmount(laborLeavePay),
    ...deductions,
  };
}

export type PayrollLedgerBuildContext = {
  organizationId?: string;
  positionHandovers?: PositionHandover[];
  laborLeaves?: LaborLeave[];
  payrollLedgers?: PayrollLedger[];
  salaryAllowanceAdjustments?: SalaryAllowanceAdjustment[];
};

export function buildPayrollLedger(
  month: string,
  staffContent: OrganizationSectionContent,
  savedLedger?: PayrollLedger,
  positionHandovers?: PositionHandover[],
  laborLeaves?: LaborLeave[],
  payrollLedgers?: PayrollLedger[],
  organizationId?: string,
  salaryAllowanceAdjustments?: SalaryAllowanceAdjustment[]
): PayrollLedger {
  const savedMap = new Map((savedLedger?.entries ?? []).map((entry) => [entry.employeeId, entry]));
  const historyLedgers = payrollLedgers;

  return {
    month,
    preparedAt: savedLedger?.preparedAt,
    entries: activeEmployees(staffContent.employees).map((employee) =>
      buildLedgerEntry(
        employee,
        staffContent,
        month,
        savedMap.get(employee.id),
        positionHandovers,
        laborLeaves,
        historyLedgers,
        organizationId,
        salaryAllowanceAdjustments
      )
    ),
  };
}

export function recalculatePayrollLedger(
  ledger: PayrollLedger,
  staffContent: OrganizationSectionContent,
  context: PayrollLedgerBuildContext = {}
): PayrollLedger {
  const { organizationId, positionHandovers, laborLeaves, payrollLedgers, salaryAllowanceAdjustments } =
    context;
  return {
    ...ledger,
    entries: ledger.entries.map((entry) => {
      const employee = staffContent.employees?.find((item) => item.id === entry.employeeId);
      if (!employee) return entry;
      return buildLedgerEntry(
        employee,
        staffContent,
        ledger.month,
        entry,
        positionHandovers,
        laborLeaves,
        payrollLedgers,
        organizationId,
        salaryAllowanceAdjustments
      );
    }),
  };
}

export function mergePayrollLedgerForMonth(
  ledgers: PayrollLedger[] | undefined,
  month: string,
  staffContent: OrganizationSectionContent,
  context: PayrollLedgerBuildContext = {}
): PayrollLedger {
  const saved = ledgers?.find((ledger) => ledger.month === month);
  return buildPayrollLedger(
    month,
    staffContent,
    saved,
    context.positionHandovers,
    context.laborLeaves,
    ledgers,
    context.organizationId,
    context.salaryAllowanceAdjustments
  );
}

export function upsertPayrollLedger(
  ledgers: PayrollLedger[] | undefined,
  ledger: PayrollLedger
): PayrollLedger[] {
  const rest = (ledgers ?? []).filter((item) => item.month !== ledger.month);
  return [...rest, ledger].sort((a, b) => b.month.localeCompare(a.month));
}

export function removePayrollLedger(
  ledgers: PayrollLedger[] | undefined,
  month: string
): PayrollLedger[] {
  return (ledgers ?? []).filter((item) => item.month !== month);
}

export function hasStoredPayrollLedger(
  ledgers: PayrollLedger[] | undefined,
  month: string
): boolean {
  return (ledgers ?? []).some((item) => item.month === month);
}

export function affectedTimesheetMonths(
  previous: OrganizationSectionContent['timesheets'],
  next: OrganizationSectionContent['timesheets']
): string[] {
  const months = new Set<string>();
  for (const sheet of previous ?? []) months.add(sheet.month);
  for (const sheet of next ?? []) months.add(sheet.month);
  return [...months];
}

/** Навсозии китоби музди меҳнат пас аз тағйири табел */
export function syncPayrollLedgersAfterTimesheetChange(
  payrollLedgers: PayrollLedger[] | undefined,
  staffContent: OrganizationSectionContent,
  months: string[],
  context: PayrollLedgerBuildContext = {}
): PayrollLedger[] {
  let ledgers = payrollLedgers ?? [];

  for (const month of months) {
    const saved = ledgers.find((ledger) => ledger.month === month);
    if (!saved) continue;

    const updated = buildPayrollLedger(
      month,
      staffContent,
      saved,
      context.positionHandovers,
      context.laborLeaves,
      ledgers,
      context.organizationId,
      context.salaryAllowanceAdjustments
    );
    ledgers = upsertPayrollLedger(ledgers, {
      ...updated,
      preparedAt: saved.preparedAt,
    });
  }

  return ledgers;
}

export {
  applyPayrollLedgerTimesheetSync,
  persistPayrollLedgerInFinance,
  postPayrollAccountingOperations,
  removePayrollLedgerInFinance,
} from '@/lib/payroll-accounting';
