import {
  getDutySalaryFromScale,
  hydrateWageScale,
  parseWageAmount,
} from '@/lib/preschool-wage-scales';
import { detectStaffColumns, isTotalRow, parseAmount } from '@/lib/staff-table-calc';
import {
  countNormWorkingDays,
  countPayrollWorkedDays,
  mergeTimesheetForMonth,
  shiftMonth,
} from '@/lib/staff-timesheet';
import {
  AllowanceAdjustmentKind,
  EmployeeWageScale,
  LaborLeave,
  OrganizationSectionContent,
  SalaryAllowanceAdjustment,
  StaffEmployee,
} from '@/types/organization-section';

function proportional(part: number, worked: number, norm: number): number {
  if (norm <= 0) return 0;
  return worked >= norm ? part : (part * worked) / norm;
}

function monthsBetweenInclusive(fromMonth: string, toMonth: string): string[] {
  const months: string[] = [];
  let current = toMonth;
  while (current >= fromMonth) {
    months.push(current);
    if (current === fromMonth) break;
    current = shiftMonth(current, -1);
  }
  return months;
}

function isServiceStaffDepartment(department: string): boolean {
  return department.toLowerCase().includes('хизматрасон');
}

function employeeTableDutySalary(
  staffContent: OrganizationSectionContent,
  department: string,
  position: string
): number | null {
  for (const table of staffContent.tables ?? []) {
    if (table.title !== department) continue;
    const columns = detectStaffColumns(table.columns);
    if (!columns) continue;

    for (const row of table.rows) {
      if (isTotalRow(row, columns.position)) continue;
      if (row[columns.position]?.trim() !== position) continue;

      const baseSalary = parseAmount(row[columns.baseSalary]);
      if (baseSalary === null) return null;

      const harmfulAmount =
        columns.harmfulAmount >= 0 ? (parseAmount(row[columns.harmfulAmount]) ?? 0) : 0;
      const nightAllowance =
        columns.nightAllowance >= 0 ? (parseAmount(row[columns.nightAllowance]) ?? 0) : 0;
      const dutySalary = baseSalary + harmfulAmount;

      if (isServiceStaffDepartment(department)) {
        return dutySalary + nightAllowance;
      }
      return dutySalary;
    }
  }
  return null;
}

export function allowancePaymentMonth(adjustment: SalaryAllowanceAdjustment): string {
  return adjustment.paymentMonth || adjustment.effectiveDate.slice(0, 7);
}

export function allowanceRetroMonths(adjustment: SalaryAllowanceAdjustment): string[] {
  const from = adjustment.effectiveDate.slice(0, 7);
  const payment = allowancePaymentMonth(adjustment);
  const lastRetro = shiftMonth(payment, -1);
  if (lastRetro < from) return [];
  return monthsBetweenInclusive(from, lastRetro);
}

export function allowanceMonthsAffected(
  adjustment: SalaryAllowanceAdjustment,
  previous?: SalaryAllowanceAdjustment
): string[] {
  const months = new Set<string>([allowancePaymentMonth(adjustment)]);
  for (const month of allowanceRetroMonths(adjustment)) months.add(month);
  if (previous) {
    months.add(allowancePaymentMonth(previous));
    for (const month of allowanceRetroMonths(previous)) months.add(month);
  }
  return [...months];
}

function resolveDutySalaries(
  adjustment: SalaryAllowanceAdjustment,
  employee: StaffEmployee,
  staffContent: OrganizationSectionContent,
  organizationId?: string
): { fromSalary: number; toSalary: number } {
  const fromManual = parseAmount(adjustment.fromDutySalary ?? '');
  const toManual = parseAmount(adjustment.toDutySalary ?? '');

  if (
    adjustment.kind === 'qualification_degree_difference' &&
    adjustment.fromEducationLevel &&
    adjustment.toEducationLevel &&
    organizationId
  ) {
    const fromScale = hydrateWageScale(
      { ...employee.wageScale, educationLevel: adjustment.fromEducationLevel },
      organizationId,
      employee.position
    );
    const toScale = hydrateWageScale(
      { ...employee.wageScale, educationLevel: adjustment.toEducationLevel },
      organizationId,
      employee.position
    );
    return {
      fromSalary: fromManual ?? getDutySalaryFromScale(fromScale, organizationId),
      toSalary: toManual ?? getDutySalaryFromScale(toScale, organizationId),
    };
  }

  const tableSalary =
    employee.department && employee.position
      ? employeeTableDutySalary(staffContent, employee.department, employee.position)
      : null;
  const wage = employee.wageScale?.baseSalary ?? employee.wageScale?.calculatedMonthly;
  const scaleSalary = wage ? parseWageAmount(wage) : null;

  return {
    fromSalary: fromManual ?? tableSalary ?? scaleSalary ?? 0,
    toSalary: toManual ?? tableSalary ?? scaleSalary ?? 0,
  };
}

export type AllowanceMonthLine = {
  month: string;
  monthlyDiff: number;
  workedDays: number;
  normDays: number;
  amount: number;
};

export type AllowanceAdjustmentBreakdown = {
  kind: AllowanceAdjustmentKind;
  paymentMonth: string;
  retroMonths: string[];
  fromSalary: number;
  toSalary: number;
  monthlyDiff: number;
  lines: AllowanceMonthLine[];
  totalAmount: number;
};

export function calcAllowanceAdjustmentBreakdown(
  adjustment: SalaryAllowanceAdjustment,
  staffContent: OrganizationSectionContent,
  organizationId?: string,
  laborLeaves?: LaborLeave[]
): AllowanceAdjustmentBreakdown | null {
  if (!adjustment.employeeId) return null;

  const employee = staffContent.employees?.find((item) => item.id === adjustment.employeeId);
  if (!employee) return null;

  const { fromSalary, toSalary } = resolveDutySalaries(
    adjustment,
    employee,
    staffContent,
    organizationId
  );
  const monthlyDiff = toSalary - fromSalary;
  if (monthlyDiff <= 0) return null;

  const retroMonths = allowanceRetroMonths(adjustment);
  const lines: AllowanceMonthLine[] = [];

  for (const month of retroMonths) {
    const timesheet = mergeTimesheetForMonth(
      staffContent.timesheets,
      month,
      staffContent.employees ?? []
    );
    const entry = timesheet.entries.find((item) => item.employeeId === adjustment.employeeId);
    const workedDays = entry
      ? countPayrollWorkedDays(entry, month, {
          laborLeaves,
          employeeId: adjustment.employeeId,
        })
      : 0;
    const normDays = countNormWorkingDays(month);
    const amount = proportional(monthlyDiff, workedDays, normDays);
    lines.push({ month, monthlyDiff, workedDays, normDays, amount });
  }

  const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  if (totalAmount <= 0) return null;

  return {
    kind: adjustment.kind,
    paymentMonth: allowancePaymentMonth(adjustment),
    retroMonths,
    fromSalary,
    toSalary,
    monthlyDiff,
    lines,
    totalAmount,
  };
}

export function calcAllowanceAdjustmentAmount(
  adjustment: SalaryAllowanceAdjustment,
  staffContent: OrganizationSectionContent,
  month: string,
  organizationId?: string,
  laborLeaves?: LaborLeave[]
): number {
  if (allowancePaymentMonth(adjustment) !== month) return 0;
  return (
    calcAllowanceAdjustmentBreakdown(adjustment, staffContent, organizationId, laborLeaves)
      ?.totalAmount ?? 0
  );
}

export function allowanceAdjustmentForEmployee(
  adjustments: SalaryAllowanceAdjustment[] | undefined,
  staffContent: OrganizationSectionContent,
  month: string,
  employeeId: string,
  organizationId?: string,
  laborLeaves?: LaborLeave[]
): number {
  return (adjustments ?? []).reduce((sum, adjustment) => {
    if (adjustment.employeeId !== employeeId) return sum;
    return (
      sum +
      calcAllowanceAdjustmentAmount(
        adjustment,
        staffContent,
        month,
        organizationId,
        laborLeaves
      )
    );
  }, 0);
}

export function previewDutySalaryFromEducation(
  employee: StaffEmployee,
  educationLevel: EmployeeWageScale['educationLevel'],
  organizationId?: string
): number | null {
  if (!organizationId || !educationLevel) return null;
  const scale = hydrateWageScale(
    { ...employee.wageScale, educationLevel },
    organizationId,
    employee.position
  );
  return getDutySalaryFromScale(scale, organizationId);
}
