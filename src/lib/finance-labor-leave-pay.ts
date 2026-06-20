import { getHolidayLabelKey } from '@/lib/staff-holidays';
import { detectStaffColumns, isTotalRow, parseAmount } from '@/lib/staff-table-calc';
import { isValidMonthKey, monthsBackFrom, shiftMonth } from '@/lib/staff-timesheet';
import {
  LaborLeave,
  LaborLeaveCalculationBasis,
  LaborLeaveType,
  OrganizationSectionContent,
  PayrollLedger,
} from '@/types/organization-section';

/** Коэффициенти миёнаи рӯзҳои тақвимӣ — ПҚҶ №313, қисми 4 */
export const AVG_LEAVE_DAYS = 29.3;

/**
 * Рухсатии пардохтшаванда аз ҳисоби корфармо (КМҶ моддаҳои 112, 115; ПҚҶ №313 қисми 3).
 * Занонӣ/беморӣ — аз суғуртаи давлатӣ (моддаи 113), ба китоби музди меҳнат ворид намешавад.
 */
export const PAID_LABOR_LEAVE_TYPES: LaborLeaveType[] = ['annual', 'study', 'creative'];

export const SALARY_PERIOD_MONTH_OPTIONS = [3, 6, 9, 12, 24] as const;

export const DEFAULT_SALARY_PERIOD_MONTHS = 12;

export function isPaidLaborLeaveType(type: LaborLeaveType): boolean {
  return PAID_LABOR_LEAVE_TYPES.includes(type);
}

export function isStateInsuranceLeaveType(type: LaborLeaveType): boolean {
  return type === 'maternity' || type === 'sick';
}

function isDateHoliday(date: Date): boolean {
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return getHolidayLabelKey(monthKey, date.getDate()) !== null;
}

/** Рӯзҳои тақвимии рухсат бе рӯзҳои ид (КМҶ моддаи 101.2; ПҚҶ №313 қисми 7) */
export function calcLeaveCalendarDays(startDate: string, endDate: string): {
  calendarDays: number;
  holidaysExcluded: number;
} {
  if (!startDate || !endDate) return { calendarDays: 0, holidaysExcluded: 0 };

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { calendarDays: 0, holidaysExcluded: 0 };
  }

  let calendarDays = 0;
  let holidaysExcluded = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (isDateHoliday(cursor)) {
      holidaysExcluded += 1;
    } else {
      calendarDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { calendarDays, holidaysExcluded };
}

/** Моҳҳо барои ҳисоби миёнаи маош (қоидаи 15-ум ва ПҚҶ №313) */
export function getSalaryMonthsForLeaveCalc(
  startDate: string,
  periodMonths: number,
  options?: {
    basis?: LaborLeaveCalculationBasis;
    lastSalaryRaiseDate?: string;
    hiredAt?: string;
  }
): { months: string[]; includesLeaveMonth: boolean } {
  const leaveMonth = startDate.slice(0, 7);
  const day = Number.parseInt(startDate.slice(8, 10), 10);
  const includesLeaveMonth = Number.isFinite(day) && day >= 15;
  const anchor = includesLeaveMonth ? leaveMonth : shiftMonth(leaveMonth, -1);

  if (!isValidMonthKey(anchor)) {
    return { months: [], includesLeaveMonth };
  }

  const basis = options?.basis ?? 'twelve_months';
  let months: string[] = [];

  const raiseDate = options?.lastSalaryRaiseDate?.trim();
  if (basis === 'since_last_raise' && raiseDate) {
    const raiseMonth = raiseDate.slice(0, 7);
    if (isValidMonthKey(raiseMonth) && raiseMonth <= anchor) {
      months = monthsBackFrom(anchor, periodMonths, raiseMonth);
    }
  }

  if (months.length === 0) {
    months = monthsBackFrom(anchor, periodMonths);
  }

  if (options?.hiredAt) {
    const hireMonth = options.hiredAt.slice(0, 7);
    const tenureMonths = months.filter((month) => month >= hireMonth);
    if (tenureMonths.length > 0) {
      months = tenureMonths;
    }
  }

  return { months, includesLeaveMonth };
}

function employeeBaseFromStaffTable(
  employeeId: string,
  staffContent: OrganizationSectionContent
): number {
  const employee = staffContent.employees?.find((item) => item.id === employeeId);
  if (!employee?.department || !employee.position) return 0;

  for (const table of staffContent.tables ?? []) {
    if (table.title !== employee.department) continue;
    const columns = detectStaffColumns(table.columns);
    if (!columns) continue;

    for (const row of table.rows) {
      if (isTotalRow(row, columns.position)) continue;
      if (row[columns.position]?.trim() !== employee.position) continue;

      const baseSalary = parseAmount(row[columns.baseSalary]);
      if (baseSalary === null) return 0;

      const harmfulAmount =
        columns.harmfulAmount >= 0
          ? (parseAmount(row[columns.harmfulAmount]) ?? 0)
          : 0;
      const nightAllowance =
        columns.nightAllowance >= 0
          ? (parseAmount(row[columns.nightAllowance]) ?? 0)
          : 0;

      return baseSalary + harmfulAmount + nightAllowance;
    }
  }

  return 0;
}

function employeeAccruedForMonth(
  employeeId: string,
  month: string,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): number {
  const saved = payrollLedgers?.find((ledger) => ledger.month === month);
  const entry = saved?.entries.find((item) => item.employeeId === employeeId);
  if (entry) {
    const base = parseAmount(entry.baseSalary) ?? 0;
    const allowances = parseAmount(entry.allowances) ?? 0;
    return base + allowances;
  }

  return employeeBaseFromStaffTable(employeeId, staffContent);
}

export function employeeMonthlyAccrued(
  employeeId: string,
  month: string,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): number {
  return employeeAccruedForMonth(employeeId, month, staffContent, payrollLedgers);
}

export type LaborLeavePayBreakdown = {
  periodMonths: number;
  calculationBasis: LaborLeaveCalculationBasis;
  salaryMonths: string[];
  includesLeaveMonth: boolean;
  monthlySalaries: number[];
  averageMonthly: number;
  dailyRate: number;
  leaveDays: number;
  holidaysExcluded: number;
  amount: number;
  usedTariffFallback: boolean;
};

export function calcLaborLeavePayBreakdown(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[],
  daysOverride?: number
): LaborLeavePayBreakdown | null {
  if (!isPaidLaborLeaveType(leave.leaveType)) return null;
  if (!leave.employeeId) return null;

  const { calendarDays, holidaysExcluded } = calcLeaveCalendarDays(
    leave.startDate,
    leave.endDate
  );
  const leaveDays =
    daysOverride ??
    (leave.days > 0 ? leave.days : calendarDays);
  if (leaveDays <= 0) return null;

  const periodMonths = leave.salaryPeriodMonths ?? DEFAULT_SALARY_PERIOD_MONTHS;
  const calculationBasis = leave.calculationBasis ?? 'twelve_months';
  const employee = staffContent.employees?.find((item) => item.id === leave.employeeId);
  const { months, includesLeaveMonth } = getSalaryMonthsForLeaveCalc(
    leave.startDate,
    periodMonths,
    {
      basis: calculationBasis,
      lastSalaryRaiseDate: leave.lastSalaryRaiseDate,
      hiredAt: employee?.hiredAt,
    }
  );

  const monthlySalaries = months.map((month) =>
    employeeAccruedForMonth(leave.employeeId, month, staffContent, payrollLedgers)
  );
  const totalAccrued = monthlySalaries.reduce((sum, value) => sum + value, 0);
  const divisor = months.length;
  let usedTariffFallback = false;
  let averageMonthly = divisor > 0 ? totalAccrued / divisor : 0;

  if (totalAccrued <= 0) {
    const tariff = employeeBaseFromStaffTable(leave.employeeId, staffContent);
    if (tariff > 0) {
      averageMonthly = tariff;
      usedTariffFallback = true;
    }
  }

  const dailyRate = averageMonthly / AVG_LEAVE_DAYS;
  const amount = dailyRate * leaveDays;

  return {
    periodMonths,
    calculationBasis,
    salaryMonths: months,
    includesLeaveMonth,
    monthlySalaries,
    averageMonthly,
    dailyRate,
    leaveDays,
    holidaysExcluded,
    amount,
    usedTariffFallback,
  };
}

export function calcLaborLeavePayAmount(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[],
  daysOverride?: number
): number {
  return (
    calcLaborLeavePayBreakdown(leave, staffContent, payrollLedgers, daysOverride)?.amount ??
    0
  );
}

/** Маблағи пурраи рухсатӣ танҳо дар моҳи оғози рухсат (моҳи ҳисобшуда) ба китоб ворид мешавад */
export function laborLeavePayForEmployee(
  laborLeaves: LaborLeave[] | undefined,
  staffContent: OrganizationSectionContent,
  payrollLedgers: PayrollLedger[] | undefined,
  month: string,
  employeeId: string
): number {
  return (laborLeaves ?? []).reduce((sum, leave) => {
    if (leave.employeeId !== employeeId) return sum;
    if (!isPaidLaborLeaveType(leave.leaveType)) return sum;
    if (leaveMonthKey(leave.startDate) !== month) return sum;

    return sum + calcLaborLeavePayAmount(leave, staffContent, payrollLedgers);
  }, 0);
}

export function leaveMonthKey(startDate: string): string {
  return startDate.slice(0, 7);
}

export function leaveOverlapsMonth(leave: LaborLeave, month: string): boolean {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  return leave.startDate <= monthEnd && leave.endDate >= monthStart;
}

/** Рӯзҳои рухсат, ки ба моҳи додашуда дохил мешаванд (бе рӯзҳои ид) */
export function leaveDaysInMonth(leave: LaborLeave, month: string): number {
  if (!leaveOverlapsMonth(leave, month)) return 0;

  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  const rangeStart = leave.startDate > monthStart ? leave.startDate : monthStart;
  const rangeEnd = leave.endDate < monthEnd ? leave.endDate : monthEnd;

  return calcLeaveCalendarDays(rangeStart, rangeEnd).calendarDays;
}

/** Ҳамаи моҳҳое, ки рухсат ба онҳо расидааст */
export function leaveMonthsAffected(leave: LaborLeave): string[] {
  const startMonth = leave.startDate.slice(0, 7);
  const endMonth = leave.endDate.slice(0, 7);
  if (!isValidMonthKey(startMonth) || !isValidMonthKey(endMonth) || startMonth > endMonth) {
    return [];
  }

  const months: string[] = [];
  let current = startMonth;
  let guard = 0;

  while (current <= endMonth && guard < 600) {
    months.push(current);
    if (current === endMonth) break;
    current = shiftMonth(current, 1);
    guard += 1;
  }

  return months;
}
