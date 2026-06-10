import {
  calcLeaveCalendarDays,
  employeeMonthlyAccrued,
} from '@/lib/finance-labor-leave-pay';
import { countNormWorkingDays, shiftMonth } from '@/lib/staff-timesheet';
import {
  LaborLeave,
  LaborLeaveCalculationBasis,
  MaternityVariant,
  OrganizationSectionContent,
  PayrollLedger,
} from '@/types/organization-section';

/** КМҶ моддаи 91: 70 рӯз пеш аз таваллуд */
export const MATERNITY_DAYS_BEFORE = 70;

/** Моҳҳои миёнаи музд барои пособие — амалиёти суғуртаи давлатӣ (3 моҳ) */
export const MATERNITY_BENEFIT_MONTHS = 3;

export function maternityDaysAfter(variant: MaternityVariant = 'standard'): number {
  switch (variant) {
    case 'complicated':
      return 86;
    case 'multiple':
      return 110;
    default:
      return 70;
  }
}

export function addCalendarDays(isoDate: string, delta: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + delta);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localTodayIso(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** КМҶ моддаи 91: муддати қонунӣ (идҳо хориҷ намешаванд — моддаи 101.2 барои истироҳати солона аст) */
export function maternityStatutoryDays(variant: MaternityVariant = 'standard'): number {
  return MATERNITY_DAYS_BEFORE + maternityDaysAfter(variant);
}

/** КМҶ моддаи 91: муддати рухсатии ҳомиладорӣ ва таваллуд */
export function calcMaternityLeavePeriod(
  expectedBirthDate: string,
  variant: MaternityVariant = 'standard'
): {
  startDate: string;
  endDate: string;
  days: number;
  daysBefore: number;
  daysAfter: number;
  expectedBirthDate: string;
  variant: MaternityVariant;
} {
  const daysBefore = MATERNITY_DAYS_BEFORE;
  const daysAfter = maternityDaysAfter(variant);
  const startDate = addCalendarDays(expectedBirthDate, -daysBefore);
  const endDate = addCalendarDays(expectedBirthDate, daysAfter - 1);

  return {
    startDate,
    endDate,
    days: daysBefore + daysAfter,
    daysBefore,
    daysAfter,
    expectedBirthDate,
    variant,
  };
}

/** 3 моҳи пеш аз оғози рухсат ( ё аз зиёд намудани музд) — барои пособие */
export function getMaternityBenefitSalaryMonths(
  startDate: string,
  options?: {
    basis?: LaborLeaveCalculationBasis;
    lastSalaryRaiseDate?: string;
    hiredAt?: string;
  }
): string[] {
  const leaveMonth = startDate.slice(0, 7);
  const basis = options?.basis ?? 'twelve_months';
  let months: string[] = [];

  if (basis === 'since_last_raise' && options?.lastSalaryRaiseDate) {
    const raiseMonth = options.lastSalaryRaiseDate.slice(0, 7);
    let current = shiftMonth(leaveMonth, -1);
    while (current >= raiseMonth && months.length < MATERNITY_BENEFIT_MONTHS) {
      months.push(current);
      current = shiftMonth(current, -1);
    }
    months.reverse();
  }

  if (months.length === 0) {
    for (let index = 1; index <= MATERNITY_BENEFIT_MONTHS; index++) {
      months.push(shiftMonth(leaveMonth, -index));
    }
    months.sort();
  }

  if (options?.hiredAt) {
    const hireMonth = options.hiredAt.slice(0, 7);
    const filtered = months.filter((month) => month >= hireMonth);
    if (filtered.length > 0) months = filtered;
  }

  return months;
}

export type MaternityBenefitBreakdown = {
  variant: MaternityVariant;
  expectedBirthDate?: string;
  daysBefore: number;
  daysAfter: number;
  salaryMonths: string[];
  monthlySalaries: number[];
  totalWages: number;
  totalWorkingDays: number;
  averageDaily: number;
  leaveDays: number;
  holidaysExcluded: number;
  amount: number;
  usedTariffFallback: boolean;
  calculationBasis: LaborLeaveCalculationBasis;
};

export function calcMaternityBenefitBreakdown(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): MaternityBenefitBreakdown | null {
  if (leave.leaveType !== 'maternity' || !leave.employeeId) return null;

  const variant = leave.maternityVariant ?? 'standard';
  const period = leave.expectedBirthDate
    ? calcMaternityLeavePeriod(leave.expectedBirthDate, variant)
    : null;

  const startDate = period?.startDate ?? leave.startDate;
  const endDate = period?.endDate ?? leave.endDate;
  const leaveDays = period?.days ?? maternityStatutoryDays(variant);
  const { holidaysExcluded } = calcLeaveCalendarDays(startDate, endDate);
  if (leaveDays <= 0) return null;

  const calculationBasis = leave.calculationBasis ?? 'twelve_months';
  const employee = staffContent.employees?.find((item) => item.id === leave.employeeId);
  const salaryMonths = getMaternityBenefitSalaryMonths(startDate, {
    basis: calculationBasis,
    lastSalaryRaiseDate: leave.lastSalaryRaiseDate,
    hiredAt: employee?.hiredAt,
  });

  const monthlySalaries = salaryMonths.map((month) =>
    employeeMonthlyAccrued(leave.employeeId, month, staffContent, payrollLedgers)
  );
  const totalWages = monthlySalaries.reduce((sum, value) => sum + value, 0);
  const totalWorkingDays = salaryMonths.reduce(
    (sum, month) => sum + countNormWorkingDays(month),
    0
  );

  let usedTariffFallback = false;
  let averageDaily = totalWorkingDays > 0 ? totalWages / totalWorkingDays : 0;

  if (totalWages <= 0 && salaryMonths.length > 0) {
    const fallbackMonth = salaryMonths[salaryMonths.length - 1];
    const tariff = employeeMonthlyAccrued(
      leave.employeeId,
      fallbackMonth,
      staffContent,
      payrollLedgers
    );
    const normDays = countNormWorkingDays(fallbackMonth) || 1;
    if (tariff > 0) {
      averageDaily = tariff / normDays;
      usedTariffFallback = true;
    }
  }

  const amount = averageDaily * leaveDays;

  return {
    variant,
    expectedBirthDate: leave.expectedBirthDate,
    daysBefore: period?.daysBefore ?? MATERNITY_DAYS_BEFORE,
    daysAfter: period?.daysAfter ?? maternityDaysAfter(variant),
    salaryMonths,
    monthlySalaries,
    totalWages,
    totalWorkingDays,
    averageDaily,
    leaveDays,
    holidaysExcluded,
    amount,
    usedTariffFallback,
    calculationBasis,
  };
}

export function calcMaternityBenefitAmount(
  leave: LaborLeave,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): number {
  return (
    calcMaternityBenefitBreakdown(leave, staffContent, payrollLedgers)?.amount ?? 0
  );
}

export function applyMaternityPeriodToLeave(leave: LaborLeave): LaborLeave {
  if (!leave.expectedBirthDate) return leave;
  const variant = leave.maternityVariant ?? 'standard';
  const period = calcMaternityLeavePeriod(leave.expectedBirthDate, variant);
  return {
    ...leave,
    startDate: period.startDate,
    endDate: period.endDate,
    days: period.days,
    maternityVariant: variant,
    expectedBirthDate: leave.expectedBirthDate,
  };
}

export function createMaternityLeave(): LaborLeave {
  const today = localTodayIso();
  return applyMaternityPeriodToLeave({
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `maternity-${Date.now()}`,
    preparedAt: today,
    orderNumber: '',
    employeeId: '',
    department: '',
    position: '',
    leaveType: 'maternity',
    startDate: today,
    endDate: today,
    days: 1,
    reason: '',
    substituteEmployeeId: '',
    salaryPeriodMonths: MATERNITY_BENEFIT_MONTHS,
    calculationBasis: 'twelve_months',
    maternityVariant: 'standard',
    expectedBirthDate: today,
  });
}
