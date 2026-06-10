import {
  employeeMonthlyAccrued,
  leaveMonthsAffected,
} from '@/lib/finance-labor-leave-pay';
import { getMaternityBenefitSalaryMonths } from '@/lib/finance-maternity-leave-pay';
import { getEmployeeDutySalary } from '@/lib/finance-payroll-ledger';
import {
  countNormWorkingDays,
  countWorkingDaysInRange,
  getDaysInMonth,
} from '@/lib/staff-timesheet';
import {
  LaborLeave,
  OrganizationSectionContent,
  PayrollLedger,
  SickLeaveBenefitCategory,
  SickLeaveWageBasis,
  StaffEmployee,
} from '@/types/organization-section';

/** ПҚҶ №313 (01.06.2007), қисми IV — пособиеи корношоямӣ */
export const SICK_LEAVE_REGULATION = 'ПҚҶ №313 (01.06.2007)';

/** КМҶ моддаи 217; Қонуни ҶТ «Дар бораи суғуртаи иҷтимоӣ» моддаи 12 */
export const SICK_LEAVE_LABOR_CODE_ARTICLES = 'КМҶ моддаи 217, Қонуни суғурта моддаи 12';

/** ПҚҶ №313 п.15 — 3 моҳ барои кормандони премиалӣ */
export const SICK_PREMIUM_WAGE_MONTHS = 3;

/** КМҶ моддаи 217 — ҳадди аксар 4 моҳ пайдарпай */
export const SICK_LEAVE_MAX_CONSECUTIVE_MONTHS = 4;

/** КМҶ моддаи 217 — сил то 12 моҳ */
export const SICK_LEAVE_MAX_TUBERCULOSIS_MONTHS = 12;

/** ПҚҶ №313 п.16 — ҳадди аксар 2× маоши вазифавӣ (ҷудо аз заҳри меҳнат/касбӣ) */
export const SICK_LEAVE_DUTY_SALARY_CAP_MULTIPLIER = 2;

/**
 * КМҶ моддаи 103 — ҳадди ақали музд дар ҳисоби моҳона.
 * Лутфан мувофиқи меъёри ҷорӣ навсозӣ кунед.
 */
export const SICK_LEAVE_MIN_MONTHLY_BENEFIT_SOMONI = 400;

const CATEGORY_PERCENT: Record<Exclude<SickLeaveBenefitCategory, 'manual'>, number> = {
  occupational_injury: 100,
  professional_disease: 100,
  war_participant: 100,
  experience_8_plus: 70,
  experience_under_8: 60,
  dependents_3_plus: 70,
  orphan_under_23: 70,
};

const CAP_EXEMPT_CATEGORIES: SickLeaveBenefitCategory[] = [
  'occupational_injury',
  'professional_disease',
];

function localTodayIso(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseExperienceYears(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const years = Number(match[1].replace(',', '.'));
  return Number.isFinite(years) ? years : null;
}

export function yearsOfServiceFromHire(hiredAt: string | undefined, asOfDate: string): number | null {
  if (!hiredAt) return null;
  const start = new Date(`${hiredAt}T00:00:00`);
  const end = new Date(`${asOfDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;

  let years = end.getFullYear() - start.getFullYear();
  const monthDelta = end.getMonth() - start.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && end.getDate() < start.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

export function suggestSickBenefitCategory(
  employee: StaffEmployee | undefined,
  startDate: string
): SickLeaveBenefitCategory {
  const fromText = parseExperienceYears(employee?.experience);
  const fromHire = yearsOfServiceFromHire(employee?.hiredAt, startDate);
  const years = fromText ?? fromHire ?? 0;
  return years >= 8 ? 'experience_8_plus' : 'experience_under_8';
}

export function resolveSickBenefitPercent(leave: LaborLeave): number {
  const category = leave.sickBenefitCategory ?? 'experience_under_8';
  if (category === 'manual') {
    const manual = leave.sickBenefitPercent ?? 60;
    return Math.min(100, Math.max(60, manual));
  }
  return CATEGORY_PERCENT[category];
}

export function isSickWageCapExempt(leave: LaborLeave): boolean {
  const category = leave.sickBenefitCategory ?? 'experience_under_8';
  return CAP_EXEMPT_CATEGORIES.includes(category);
}

function resolveLeaveDepartmentPosition(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent
): { department: string; position: string } | null {
  const employee = staffContent.employees?.find((item) => item.id === leave.employeeId);
  const department = leave.department?.trim() || employee?.department?.trim() || '';
  const position = leave.position?.trim() || employee?.position?.trim() || '';
  if (!department || !position) return null;
  return { department, position };
}

export function countSickWorkingDaysInMonth(
  startDate: string,
  endDate: string,
  month: string
): number {
  const daysInMonth = getDaysInMonth(month);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  if (endDate < monthStart || startDate > monthEnd) return 0;

  const rangeStart = startDate > monthStart ? startDate : monthStart;
  const rangeEnd = endDate < monthEnd ? endDate : monthEnd;
  return countWorkingDaysInRange(rangeStart, rangeEnd);
}

function monthsSpanInclusive(startDate: string, endDate: string): number {
  const startMonth = startDate.slice(0, 7);
  const endMonth = endDate.slice(0, 7);
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

export type SickLeaveDurationCheck = {
  monthsSpan: number;
  exceedsLimit: boolean;
  maxMonths: number;
};

export function checkSickLeaveDuration(leave: LaborLeave): SickLeaveDurationCheck {
  const monthsSpan = monthsSpanInclusive(leave.startDate, leave.endDate);
  const maxMonths = leave.sickIsTuberculosis
    ? SICK_LEAVE_MAX_TUBERCULOSIS_MONTHS
    : SICK_LEAVE_MAX_CONSECUTIVE_MONTHS;
  return {
    monthsSpan,
    exceedsLimit: monthsSpan > maxMonths,
    maxMonths,
  };
}

function resolveMonthlyWageForSick(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent,
  payrollLedgers: PayrollLedger[] | undefined,
  dutySalary: number
): { monthlyWage: number; wageBasis: SickLeaveWageBasis; wageCapped: boolean } {
  const wageBasis = leave.sickWageBasis ?? 'time_rate';

  let monthlyWage = dutySalary;
  if (wageBasis === 'premium' && leave.employeeId) {
    const employee = staffContent.employees?.find((item) => item.id === leave.employeeId);
    const salaryMonths = getMaternityBenefitSalaryMonths(leave.startDate, {
      hiredAt: employee?.hiredAt,
    }).slice(0, SICK_PREMIUM_WAGE_MONTHS);

    if (salaryMonths.length > 0) {
      const total = salaryMonths.reduce(
        (sum, month) =>
          sum + employeeMonthlyAccrued(leave.employeeId!, month, staffContent, payrollLedgers),
        0
      );
      monthlyWage = total / salaryMonths.length;
    }
  }

  let wageCapped = false;
  if (!isSickWageCapExempt(leave) && dutySalary > 0) {
    const cap = dutySalary * SICK_LEAVE_DUTY_SALARY_CAP_MULTIPLIER;
    if (monthlyWage > cap) {
      monthlyWage = cap;
      wageCapped = true;
    }
  }

  return { monthlyWage, wageBasis, wageCapped };
}

function applyMonthlyMinimumFloor(
  amount: number,
  sickWorkingDays: number,
  normWorkingDays: number
): { amount: number; minFloorApplied: boolean } {
  if (
    SICK_LEAVE_MIN_MONTHLY_BENEFIT_SOMONI <= 0 ||
    sickWorkingDays <= 0 ||
    normWorkingDays <= 0
  ) {
    return { amount, minFloorApplied: false };
  }

  const projectedMonthly = (amount / sickWorkingDays) * normWorkingDays;
  if (projectedMonthly >= SICK_LEAVE_MIN_MONTHLY_BENEFIT_SOMONI) {
    return { amount, minFloorApplied: false };
  }

  const adjusted = (SICK_LEAVE_MIN_MONTHLY_BENEFIT_SOMONI / normWorkingDays) * sickWorkingDays;
  return { amount: adjusted, minFloorApplied: true };
}

export type SickBenefitBreakdown = {
  dutySalary: number;
  monthlyWage: number;
  wageBasis: SickLeaveWageBasis;
  wageCapped: boolean;
  benefitPercent: number;
  benefitCategory: SickLeaveBenefitCategory;
  normWorkingDays: number;
  dailyBenefit: number;
  sickWorkingDays: number;
  amount: number;
  amountBeforeMinFloor: number;
  minFloorApplied: boolean;
  monthKey: string;
};

export function applySickPeriodToLeave(leave: LaborLeave): LaborLeave {
  const sickWorkingDays = countWorkingDaysInRange(leave.startDate, leave.endDate);
  return {
    ...leave,
    leaveType: 'sick',
    days: sickWorkingDays > 0 ? sickWorkingDays : leave.days,
    sickWageBasis: leave.sickWageBasis ?? 'time_rate',
    sickBenefitCategory: leave.sickBenefitCategory ?? 'experience_under_8',
  };
}

function calcSickBenefitForMonthRaw(
  leave: LaborLeave,
  month: string,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): number {
  if (leave.leaveType !== 'sick' || !leave.employeeId) return 0;

  const placement = resolveLeaveDepartmentPosition(leave, staffContent);
  if (!placement) return 0;

  const dutySalary = getEmployeeDutySalary(
    staffContent,
    placement.department,
    placement.position
  );
  if (dutySalary === null || dutySalary <= 0) return 0;

  const normWorkingDays = countNormWorkingDays(month);
  if (normWorkingDays <= 0) return 0;

  const sickWorkingDays = countSickWorkingDaysInMonth(leave.startDate, leave.endDate, month);
  if (sickWorkingDays <= 0) return 0;

  const { monthlyWage } = resolveMonthlyWageForSick(
    leave,
    staffContent,
    payrollLedgers,
    dutySalary
  );
  const benefitPercent = resolveSickBenefitPercent(leave);

  return (monthlyWage / normWorkingDays) * sickWorkingDays * (benefitPercent / 100);
}

export function calcSickBenefitForMonth(
  leave: LaborLeave,
  month: string,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): number {
  const normWorkingDays = countNormWorkingDays(month);
  const sickWorkingDays = countSickWorkingDaysInMonth(leave.startDate, leave.endDate, month);
  const raw = calcSickBenefitForMonthRaw(leave, month, staffContent, payrollLedgers);
  return applyMonthlyMinimumFloor(raw, sickWorkingDays, normWorkingDays).amount;
}

export function calcSickBenefitBreakdown(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): SickBenefitBreakdown | null {
  if (leave.leaveType !== 'sick' || !leave.employeeId) return null;

  const placement = resolveLeaveDepartmentPosition(leave, staffContent);
  if (!placement) return null;

  const dutySalary = getEmployeeDutySalary(
    staffContent,
    placement.department,
    placement.position
  );
  if (dutySalary === null || dutySalary <= 0) return null;

  const monthKey = leave.startDate.slice(0, 7);
  const normWorkingDays = countNormWorkingDays(monthKey);
  if (normWorkingDays <= 0) return null;

  const sickWorkingDays =
    leave.days > 0 ? leave.days : countWorkingDaysInRange(leave.startDate, leave.endDate);
  if (sickWorkingDays <= 0) return null;

  const { monthlyWage, wageBasis, wageCapped } = resolveMonthlyWageForSick(
    leave,
    staffContent,
    payrollLedgers,
    dutySalary
  );
  const benefitPercent = resolveSickBenefitPercent(leave);
  const benefitCategory = leave.sickBenefitCategory ?? 'experience_under_8';
  const dailyBenefit = (monthlyWage / normWorkingDays) * (benefitPercent / 100);

  let amount = 0;
  let amountBeforeMinFloor = 0;
  let minFloorApplied = false;
  for (const month of leaveMonthsAffected(leave)) {
    const raw = calcSickBenefitForMonthRaw(leave, month, staffContent, payrollLedgers);
    const monthSickDays = countSickWorkingDaysInMonth(leave.startDate, leave.endDate, month);
    const monthNormDays = countNormWorkingDays(month);
    amountBeforeMinFloor += raw;
    const floored = applyMonthlyMinimumFloor(raw, monthSickDays, monthNormDays);
    amount += floored.amount;
    if (floored.minFloorApplied) minFloorApplied = true;
  }

  return {
    dutySalary,
    monthlyWage,
    wageBasis,
    wageCapped,
    benefitPercent,
    benefitCategory,
    normWorkingDays,
    dailyBenefit,
    sickWorkingDays,
    amount,
    amountBeforeMinFloor,
    minFloorApplied,
    monthKey,
  };
}

export function calcSickBenefitAmount(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): number {
  return calcSickBenefitBreakdown(leave, staffContent, payrollLedgers)?.amount ?? 0;
}

export function createSickLeave(): LaborLeave {
  const today = localTodayIso();
  return applySickPeriodToLeave({
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sick-${Date.now()}`,
    preparedAt: today,
    orderNumber: '',
    employeeId: '',
    department: '',
    position: '',
    leaveType: 'sick',
    startDate: today,
    endDate: today,
    days: 1,
    reason: '',
    substituteEmployeeId: '',
    certificateNumber: '',
    sickWageBasis: 'time_rate',
    sickBenefitCategory: 'experience_under_8',
    sickIsTuberculosis: false,
  });
}
