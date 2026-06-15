import {
  getDutySalaryFromScale,
  hydrateWageScale,
} from '@/lib/preschool-wage-scales';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  countNormWorkingDays,
  countPayrollWorkedDays,
  getDaysInMonth,
  mergeTimesheetForMonth,
  resolveTimesheetMark,
  shiftMonth,
} from '@/lib/staff-timesheet';
import {
  AllowanceAdjustmentKind,
  EmployeeWageScale,
  LaborLeave,
  OrganizationSectionContent,
  SalaryAllowanceAdjustment,
  StaffEmployee,
  StaffTimesheetEntry,
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

function effectiveStartDay(effectiveDate: string): number {
  const day = Number.parseInt(effectiveDate.slice(8, 10), 10);
  return Number.isFinite(day) && day >= 1 ? day : 1;
}

export type AllowanceMonthSpec = {
  month: string;
  /** Аз рӯзи эътибор (барои дараҷаи тахассусӣ) */
  partialFromDay?: number;
};

/** Моҳҳои гузашта: тамоми моҳҳои байни эътибор ва моҳи пеш аз пардохт */
function pastMonthCalcSpecs(adjustment: SalaryAllowanceAdjustment): AllowanceMonthSpec[] {
  const from = adjustment.effectiveDate.slice(0, 7);
  const payment = allowancePaymentMonth(adjustment);
  const lastRetro = shiftMonth(payment, -1);
  if (lastRetro < from) return [];
  return monthsBetweenInclusive(from, lastRetro).map((month) => ({ month }));
}

/**
 * Дараҷаи тахассусӣ: моҳҳои пурраи гузашта + қисми моҳи эътибор/пардохт
 * аз рӯзи эътибор (Қарори №113, КМҶ моддаҳои 161, 165).
 */
function qualificationCalcSpecs(adjustment: SalaryAllowanceAdjustment): AllowanceMonthSpec[] {
  const from = adjustment.effectiveDate.slice(0, 7);
  const payment = allowancePaymentMonth(adjustment);
  const startDay = effectiveStartDay(adjustment.effectiveDate);
  const specs: AllowanceMonthSpec[] = [];

  const lastFullRetro = shiftMonth(payment, -1);
  if (lastFullRetro >= from) {
    for (const month of monthsBetweenInclusive(from, lastFullRetro)) {
      specs.push(
        month === from && startDay > 1 ? { month, partialFromDay: startDay } : { month }
      );
    }
  }

  if (from === payment) {
    specs.push({ month: payment, partialFromDay: startDay });
  }

  return specs;
}

export function allowanceCalcMonthSpecs(adjustment: SalaryAllowanceAdjustment): AllowanceMonthSpec[] {
  if (adjustment.kind === 'qualification_degree_difference') {
    return qualificationCalcSpecs(adjustment);
  }
  return pastMonthCalcSpecs(adjustment);
}

/** @deprecated Use allowanceCalcMonthSpecs */
export function allowanceRetroMonths(adjustment: SalaryAllowanceAdjustment): string[] {
  return allowanceCalcMonthSpecs(adjustment).map((spec) => spec.month);
}

export function allowancePaymentMonth(adjustment: SalaryAllowanceAdjustment): string {
  return adjustment.paymentMonth || adjustment.effectiveDate.slice(0, 7);
}

function workedDaysForMonthSpec(
  entry: StaffTimesheetEntry | undefined,
  month: string,
  partialFromDay: number | undefined,
  laborLeaves?: LaborLeave[],
  employeeId?: string
): number {
  if (!entry) return 0;

  if (!partialFromDay || partialFromDay <= 1) {
    return countPayrollWorkedDays(entry, month, { laborLeaves, employeeId });
  }

  const daysInMonth = getDaysInMonth(month);
  let count = 0;
  for (let day = partialFromDay; day <= daysInMonth; day++) {
    if (resolveTimesheetMark(entry, month, day) === '8') count++;
  }
  return count;
}

export type AllowanceBreakdownIssue =
  | 'missing_employee'
  | 'missing_qualification_levels'
  | 'missing_manual_salaries'
  | 'invalid_salary_diff'
  | 'no_calc_months'
  | 'no_worked_days';

function resolveQualificationDutySalaries(
  adjustment: SalaryAllowanceAdjustment,
  employee: StaffEmployee,
  organizationId?: string
): { fromSalary: number; toSalary: number } | null {
  if (
    !organizationId ||
    !adjustment.fromEducationLevel ||
    !adjustment.toEducationLevel
  ) {
    return null;
  }

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
    fromSalary: getDutySalaryFromScale(fromScale, organizationId),
    toSalary: getDutySalaryFromScale(toScale, organizationId),
  };
}

function resolvePastMonthDutySalaries(adjustment: SalaryAllowanceAdjustment): {
  fromSalary: number;
  toSalary: number;
} | null {
  const fromSalary = parseAmount(adjustment.fromDutySalary ?? '');
  const toSalary = parseAmount(adjustment.toDutySalary ?? '');
  if (fromSalary === null || toSalary === null) return null;
  return { fromSalary, toSalary };
}

function resolveDutySalaries(
  adjustment: SalaryAllowanceAdjustment,
  employee: StaffEmployee,
  organizationId?: string
): { fromSalary: number; toSalary: number } | null {
  if (adjustment.kind === 'qualification_degree_difference') {
    return resolveQualificationDutySalaries(adjustment, employee, organizationId);
  }
  return resolvePastMonthDutySalaries(adjustment);
}

export function explainAllowanceBreakdownIssue(
  adjustment: SalaryAllowanceAdjustment,
  staffContent: OrganizationSectionContent,
  organizationId?: string,
  laborLeaves?: LaborLeave[]
): AllowanceBreakdownIssue | null {
  if (!adjustment.employeeId) return 'missing_employee';

  const employee = staffContent.employees?.find((item) => item.id === adjustment.employeeId);
  if (!employee) return 'missing_employee';

  if (adjustment.kind === 'qualification_degree_difference') {
    if (!adjustment.fromEducationLevel || !adjustment.toEducationLevel) {
      return 'missing_qualification_levels';
    }
  } else if (!adjustment.fromDutySalary?.trim() || !adjustment.toDutySalary?.trim()) {
    return 'missing_manual_salaries';
  }

  const salaries = resolveDutySalaries(adjustment, employee, organizationId);
  if (!salaries || salaries.toSalary - salaries.fromSalary <= 0) {
    return 'invalid_salary_diff';
  }

  const monthSpecs = allowanceCalcMonthSpecs(adjustment);
  if (monthSpecs.length === 0) return 'no_calc_months';

  const timesheet = mergeTimesheetForMonth(
    staffContent.timesheets,
    monthSpecs[0].month,
    staffContent.employees ?? []
  );

  let hasWorkedDays = false;
  for (const spec of monthSpecs) {
    const sheet = mergeTimesheetForMonth(
      staffContent.timesheets,
      spec.month,
      staffContent.employees ?? []
    );
    const entry = sheet.entries.find((item) => item.employeeId === adjustment.employeeId);
    const workedDays = workedDaysForMonthSpec(
      entry,
      spec.month,
      spec.partialFromDay,
      laborLeaves,
      adjustment.employeeId
    );
    if (workedDays > 0) {
      hasWorkedDays = true;
      break;
    }
  }

  void timesheet;
  if (!hasWorkedDays) return 'no_worked_days';
  return null;
}

export function allowanceMonthsAffected(
  adjustment: SalaryAllowanceAdjustment,
  previous?: SalaryAllowanceAdjustment
): string[] {
  const months = new Set<string>([allowancePaymentMonth(adjustment)]);
  for (const spec of allowanceCalcMonthSpecs(adjustment)) months.add(spec.month);
  if (previous) {
    months.add(allowancePaymentMonth(previous));
    for (const spec of allowanceCalcMonthSpecs(previous)) months.add(spec.month);
  }
  return [...months];
}

export type AllowanceMonthLine = {
  month: string;
  monthlyDiff: number;
  workedDays: number;
  normDays: number;
  amount: number;
  partialFromDay?: number;
};

export type AllowanceAdjustmentBreakdown = {
  kind: AllowanceAdjustmentKind;
  paymentMonth: string;
  calcMonths: AllowanceMonthSpec[];
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
  if (explainAllowanceBreakdownIssue(adjustment, staffContent, organizationId, laborLeaves)) {
    return null;
  }

  const employee = staffContent.employees?.find((item) => item.id === adjustment.employeeId);
  if (!employee) return null;

  const salaries = resolveDutySalaries(adjustment, employee, organizationId);
  if (!salaries) return null;

  const { fromSalary, toSalary } = salaries;
  const monthlyDiff = toSalary - fromSalary;
  if (monthlyDiff <= 0) return null;

  const calcMonths = allowanceCalcMonthSpecs(adjustment);
  const lines: AllowanceMonthLine[] = [];

  for (const spec of calcMonths) {
    const timesheet = mergeTimesheetForMonth(
      staffContent.timesheets,
      spec.month,
      staffContent.employees ?? []
    );
    const entry = timesheet.entries.find((item) => item.employeeId === adjustment.employeeId);
    const workedDays = workedDaysForMonthSpec(
      entry,
      spec.month,
      spec.partialFromDay,
      laborLeaves,
      adjustment.employeeId
    );
    const normDays = countNormWorkingDays(spec.month);
    const amount = proportional(monthlyDiff, workedDays, normDays);
    lines.push({
      month: spec.month,
      monthlyDiff,
      workedDays,
      normDays,
      amount,
      partialFromDay: spec.partialFromDay,
    });
  }

  const totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
  if (totalAmount <= 0) return null;

  return {
    kind: adjustment.kind,
    paymentMonth: allowancePaymentMonth(adjustment),
    calcMonths,
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

export function formatQualificationDutySalaryPreview(
  employee: StaffEmployee,
  educationLevel: EmployeeWageScale['educationLevel'],
  organizationId?: string
): string {
  const value = previewDutySalaryFromEducation(employee, educationLevel, organizationId);
  return value === null ? '' : formatAmount(value);
}
