import {
  calcEntryTotals,
  mergePayrollLedgerForMonth,
  payrollLedgerPersonGroupKey,
  type PayrollLedgerBuildContext,
} from '@/lib/finance-payroll-ledger';
import { isStateInsuranceLeaveType } from '@/lib/finance-labor-leave-pay';
import { socialInsurancePayForLeaveInMonth } from '@/lib/finance-social-insurance-pay';
import {
  calcEmployerFhea25,
  PAYROLL_FHEA_EMPLOYEE_RATE,
} from '@/lib/payroll-accounting';
import { activeEmployees } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import {
  LaborLeave,
  OrganizationSectionContent,
  SocialInsuranceAgencyPaymentRecord,
  SocialInsuranceAgencyReportSettings,
  StaffEmployee,
} from '@/types/organization-section';

export type AdsinQuarter = 1 | 2 | 3 | 4;

export const ADSIN_QUARTER_MONTHS: Record<AdsinQuarter, number[]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
};

export const ADSIN_MONTH_LABELS_TJ = [
  'Январ',
  'Феврал',
  'Март',
  'Апрел',
  'Май',
  'Июн',
  'Июл',
  'Август',
  'Сентябр',
  'Октябр',
  'Ноябр',
  'Декабр',
] as const;

export const ADSIN_MONTH_LABELS_LOWER = [
  'январ',
  'феврал',
  'март',
  'апрел',
  'май',
  'июн',
  'июл',
  'август',
  'сентябр',
  'октябр',
  'ноябр',
  'декабр',
] as const;

export type AdsinMonthlyPayrollStat = {
  month: string;
  monthIndex: number;
  monthLabel: string;
  employeeCount: number;
  payrollFund: number;
};

export type AdsinEmployeeQuarterRow = {
  index: number;
  employeeId: string;
  ris: string;
  fullName: string;
  monthlyGross: Record<string, number>;
  quarterGross: number;
  socialInsurance1Percent: number;
};

export type AdsinBenefitCategory =
  | 'sick_temporary'
  | 'maternity_birth'
  | 'childcare_under_1_5'
  | 'funeral';

export type AdsinBenefitRow = {
  index: number;
  category: AdsinBenefitCategory;
  categoryLabel: string;
  employeeId: string;
  ris: string;
  fullName: string;
  monthlyAmounts: Record<string, number>;
  total: number;
};

export type AdsinStaffMovementKind = 'dismissed' | 'hired';

export type AdsinStaffMovementRow = {
  index: number;
  kind: AdsinStaffMovementKind;
  employeeId: string;
  ris: string;
  fullName: string;
  eventDate: string;
  reason: string;
};

export type AdsinContributionTotals = {
  employer25: number;
  employee1: number;
};

export type SocialInsuranceAgencyReportDocument = {
  year: number;
  quarter: AdsinQuarter;
  quarterMonths: string[];
  organizationName: string;
  rmsCode: string;
  ryam?: string;
  monthlyStats: AdsinMonthlyPayrollStat[];
  yearToDatePayrollFund: number;
  quarterPayrollFund: number;
  quarterEmployeeCount: number;
  calculatedYtd: AdsinContributionTotals;
  calculatedQuarter: AdsinContributionTotals;
  calculatedLastQuarterOfPriorYear: AdsinContributionTotals;
  employeeRows: AdsinEmployeeQuarterRow[];
  benefitRows: AdsinBenefitRow[];
  staffMovements: AdsinStaffMovementRow[];
  paymentRecords1Percent: SocialInsuranceAgencyPaymentRecord[];
  paymentRecords25Percent: SocialInsuranceAgencyPaymentRecord[];
  settings: SocialInsuranceAgencyReportSettings;
};

export function supportsSocialInsuranceAgencyReporting(_organizationId?: string): boolean {
  return true;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function resolveAdsinYear(
  financeContent: OrganizationSectionContent,
  preferredYear?: number | null
): number {
  if (preferredYear && preferredYear >= 2000 && preferredYear <= 2100) return preferredYear;
  const fromSettings = financeContent.socialInsuranceAgencySettings?.fiscalYear;
  if (fromSettings) {
    const parsed = Number.parseInt(fromSettings, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  const ledgers = financeContent.payrollLedgers ?? [];
  if (ledgers.length > 0) {
    return Number.parseInt(ledgers[0].month.slice(0, 4), 10);
  }
  return new Date().getFullYear();
}

export function resolveAdsinQuarter(preferred?: AdsinQuarter | null): AdsinQuarter {
  if (preferred && preferred >= 1 && preferred <= 4) return preferred;
  const currentMonth = new Date().getMonth() + 1;
  return (Math.ceil(currentMonth / 3) as AdsinQuarter) || 1;
}

function payrollContext(
  financeContent: OrganizationSectionContent,
  organizationId?: string
): PayrollLedgerBuildContext {
  return {
    positionHandovers: financeContent.positionHandovers,
    laborLeaves: financeContent.laborLeaves,
    salaryAllowanceAdjustments: financeContent.salaryAllowanceAdjustments,
    organizationId,
  };
}

function employeeById(
  staffContent: OrganizationSectionContent,
  employeeId: string
): StaffEmployee | undefined {
  return staffContent.employees?.find((employee) => employee.id === employeeId);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function summarizePayrollMonth(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  month: string,
  organizationId?: string
): { employeeCount: number; payrollFund: number; employer25: number; employee1: number } {
  const ledger = mergePayrollLedgerForMonth(
    financeContent.payrollLedgers,
    month,
    staffContent,
    payrollContext(financeContent, organizationId)
  );

  let employeeCount = 0;
  let payrollFund = 0;
  let employer25 = 0;
  let employee1 = 0;

  for (const entry of ledger.entries) {
    const totals = calcEntryTotals(entry);
    if (totals.gross <= 0) continue;
    employeeCount += 1;
    payrollFund += totals.gross;
    employer25 += calcEmployerFhea25(totals.gross);
    employee1 += totals.fhea > 0 ? totals.fhea : roundMoney(totals.gross * PAYROLL_FHEA_EMPLOYEE_RATE);
  }

  return {
    employeeCount,
    payrollFund: roundMoney(payrollFund),
    employer25: roundMoney(employer25),
    employee1: roundMoney(employee1),
  };
}

function monthsThroughQuarter(year: number, quarter: AdsinQuarter): string[] {
  const lastMonth = ADSIN_QUARTER_MONTHS[quarter][2];
  return Array.from({ length: lastMonth }, (_, index) => monthKey(year, index + 1));
}

function priorYearLastQuarterMonths(year: number): string[] {
  const priorYear = year - 1;
  return [10, 11, 12].map((month) => monthKey(priorYear, month));
}

function sumContributions(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  months: string[],
  organizationId?: string
): AdsinContributionTotals {
  let employer25 = 0;
  let employee1 = 0;
  for (const month of months) {
    const summary = summarizePayrollMonth(financeContent, staffContent, month, organizationId);
    employer25 += summary.employer25;
    employee1 += summary.employee1;
  }
  return {
    employer25: roundMoney(employer25),
    employee1: roundMoney(employee1),
  };
}

function buildMonthlyStats(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  year: number,
  organizationId?: string
): AdsinMonthlyPayrollStat[] {
  return ADSIN_MONTH_LABELS_TJ.map((monthLabel, index) => {
    const month = monthKey(year, index + 1);
    const summary = summarizePayrollMonth(financeContent, staffContent, month, organizationId);
    return {
      month,
      monthIndex: index,
      monthLabel,
      employeeCount: summary.employeeCount,
      payrollFund: summary.payrollFund,
    };
  });
}

function buildEmployeeQuarterRows(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  year: number,
  quarter: AdsinQuarter,
  organizationId?: string
): AdsinEmployeeQuarterRow[] {
  const quarterMonths = ADSIN_QUARTER_MONTHS[quarter].map((month) => monthKey(year, month));
  const grouped = new Map<
    string,
    {
      employee: StaffEmployee;
      monthlyGross: Record<string, number>;
    }
  >();

  for (const month of quarterMonths) {
    const ledger = mergePayrollLedgerForMonth(
      financeContent.payrollLedgers,
      month,
      staffContent,
      payrollContext(financeContent, organizationId)
    );

    for (const entry of ledger.entries) {
      const totals = calcEntryTotals(entry);
      if (totals.gross <= 0) continue;
      const employee = employeeById(staffContent, entry.employeeId);
      if (!employee) continue;
      const key = payrollLedgerPersonGroupKey(employee);
      const existing = grouped.get(key) ?? { employee, monthlyGross: {} };
      existing.monthlyGross[month] = (existing.monthlyGross[month] ?? 0) + totals.gross;
      grouped.set(key, existing);
    }
  }

  return [...grouped.values()]
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName, 'tg'))
    .map((item, index) => {
      const quarterGross = roundMoney(
        quarterMonths.reduce((sum, month) => sum + (item.monthlyGross[month] ?? 0), 0)
      );
      return {
        index: index + 1,
        employeeId: item.employee.id,
        ris: item.employee.ris?.trim() ?? '',
        fullName: item.employee.fullName,
        monthlyGross: Object.fromEntries(
          quarterMonths.map((month) => [month, roundMoney(item.monthlyGross[month] ?? 0)])
        ),
        quarterGross,
        socialInsurance1Percent: roundMoney(quarterGross * PAYROLL_FHEA_EMPLOYEE_RATE),
      };
    });
}

const BENEFIT_CATEGORY_LABELS: Record<AdsinBenefitCategory, string> = {
  sick_temporary: 'Кӯмакпули барои корношоямии мувақатӣ',
  maternity_birth: 'Кӯмакпулӣ барои ҳомиладорӣ ва таваллуд',
  childcare_under_1_5: 'Кӯмакпулӣ барои нигоҳубини кӯдаки то синни 1,5 сола',
  funeral: 'Кӯмакпулӣ барои дафн',
};

function benefitCategoryForLeave(leave: LaborLeave): AdsinBenefitCategory | null {
  if (leave.leaveType === 'sick') return 'sick_temporary';
  if (leave.leaveType === 'maternity') return 'maternity_birth';
  return null;
}

function buildBenefitRows(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  year: number,
  quarter: AdsinQuarter
): AdsinBenefitRow[] {
  const quarterMonths = ADSIN_QUARTER_MONTHS[quarter].map((month) => monthKey(year, month));
  const rows: AdsinBenefitRow[] = [];

  for (const leave of financeContent.laborLeaves ?? []) {
    if (!isStateInsuranceLeaveType(leave.leaveType)) continue;
    const category = benefitCategoryForLeave(leave);
    if (!category) continue;

    const monthlyAmounts: Record<string, number> = {};
    let total = 0;
    for (const month of quarterMonths) {
      const amount = socialInsurancePayForLeaveInMonth(
        leave,
        month,
        staffContent,
        financeContent.payrollLedgers
      );
      if (amount > 0) {
        monthlyAmounts[month] = roundMoney(amount);
        total += amount;
      }
    }
    if (total <= 0) continue;

    const employee = employeeById(staffContent, leave.employeeId);
    rows.push({
      index: rows.length + 1,
      category,
      categoryLabel: BENEFIT_CATEGORY_LABELS[category],
      employeeId: leave.employeeId,
      ris: employee?.ris?.trim() ?? '',
      fullName: employee?.fullName ?? leave.employeeId,
      monthlyAmounts,
      total: roundMoney(total),
    });
  }

  return rows;
}

function buildStaffMovements(
  staffContent: OrganizationSectionContent,
  year: number,
  quarter: AdsinQuarter
): AdsinStaffMovementRow[] {
  const quarterStart = monthKey(year, ADSIN_QUARTER_MONTHS[quarter][0]);
  const quarterEnd = monthKey(year, ADSIN_QUARTER_MONTHS[quarter][2]);
  const rows: AdsinStaffMovementRow[] = [];

  for (const employee of staffContent.employees ?? []) {
    if (employee.hiredAt) {
      const hireMonth = employee.hiredAt.slice(0, 7);
      if (hireMonth >= quarterStart && hireMonth <= quarterEnd) {
        rows.push({
          index: rows.length + 1,
          kind: 'hired',
          employeeId: employee.id,
          ris: employee.ris?.trim() ?? '',
          fullName: employee.fullName,
          eventDate: employee.hiredAt,
          reason: employee.position || 'Қабул ба кор',
        });
      }
    }

    if (employee.status === 'inactive' && employee.hiredAt) {
      // Бе санаи озодкунӣ — танҳо дар сабти корманд намоиш дода мешавад, агар санаи қабул мавҷуд бошад
      rows.push({
        index: rows.length + 1,
        kind: 'dismissed',
        employeeId: employee.id,
        ris: employee.ris?.trim() ?? '',
        fullName: employee.fullName,
        eventDate: '',
        reason: employee.position ? `Озод кардан — ${employee.position}` : 'Озод кардан',
      });
    }
  }

  return rows;
}

function sumPaymentRecords(
  records: SocialInsuranceAgencyPaymentRecord[] | undefined,
  months: string[]
): number {
  let total = 0;
  for (const record of records ?? []) {
    for (const month of months) {
      total += record.monthAmounts?.[month] ?? 0;
    }
  }
  return roundMoney(total);
}

export function buildSocialInsuranceAgencyReport(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  organization: Organization | undefined,
  options: {
    year?: number;
    quarter?: AdsinQuarter;
    organizationName?: string;
  } = {}
): SocialInsuranceAgencyReportDocument {
  const year = options.year ?? resolveAdsinYear(financeContent);
  const quarter = options.quarter ?? resolveAdsinQuarter();
  const quarterMonths = ADSIN_QUARTER_MONTHS[quarter].map((month) => monthKey(year, month));
  const ytdMonths = monthsThroughQuarter(year, quarter);
  const settings = financeContent.socialInsuranceAgencySettings ?? {};

  const monthlyStats = buildMonthlyStats(
    financeContent,
    staffContent,
    year,
    organization?.id
  );

  const yearToDatePayrollFund = roundMoney(
    monthlyStats
      .filter((stat) => ytdMonths.includes(stat.month))
      .reduce((sum, stat) => sum + stat.payrollFund, 0)
  );

  const quarterPayrollFund = roundMoney(
    monthlyStats
      .filter((stat) => quarterMonths.includes(stat.month))
      .reduce((sum, stat) => sum + stat.payrollFund, 0)
  );

  const quarterEmployeeCount = Math.max(
    ...monthlyStats
      .filter((stat) => quarterMonths.includes(stat.month))
      .map((stat) => stat.employeeCount),
    0
  );

  return {
    year,
    quarter,
    quarterMonths,
    organizationName:
      options.organizationName?.trim() ||
      financeContent.reportHeader?.reportOrganizationName?.trim() ||
      organization?.name ||
      '',
    rmsCode: organization?.rma?.trim() ?? '',
    ryam: organization?.ryam?.trim(),
    monthlyStats,
    yearToDatePayrollFund,
    quarterPayrollFund,
    quarterEmployeeCount,
    calculatedYtd: sumContributions(
      financeContent,
      staffContent,
      ytdMonths,
      organization?.id
    ),
    calculatedQuarter: sumContributions(
      financeContent,
      staffContent,
      quarterMonths,
      organization?.id
    ),
    calculatedLastQuarterOfPriorYear: sumContributions(
      financeContent,
      staffContent,
      priorYearLastQuarterMonths(year),
      organization?.id
    ),
    employeeRows: buildEmployeeQuarterRows(
      financeContent,
      staffContent,
      year,
      quarter,
      organization?.id
    ),
    benefitRows: buildBenefitRows(financeContent, staffContent, year, quarter),
    staffMovements: buildStaffMovements(staffContent, year, quarter),
    paymentRecords1Percent: settings.paymentRecords1Percent ?? [],
    paymentRecords25Percent: settings.paymentRecords25Percent ?? [],
    settings,
  };
}

export function activeStaffCount(staffContent: OrganizationSectionContent): number {
  return activeEmployees(staffContent.employees ?? []).length;
}

export function quarterPaymentTotal1Percent(document: SocialInsuranceAgencyReportDocument): number {
  return sumPaymentRecords(document.paymentRecords1Percent, document.quarterMonths);
}

export function quarterPaymentTotal25Percent(document: SocialInsuranceAgencyReportDocument): number {
  return sumPaymentRecords(document.paymentRecords25Percent, document.quarterMonths);
}
