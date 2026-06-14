import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  FuneralAllowance,
  FuneralAllowanceCaseType,
  FuneralAllowancePaymentSource,
} from '@/types/organization-section';

/** КМҶ моддаи 220; Қонуни суғурта моддаи 16 */
export const FUNERAL_ALLOWANCE_LABOR_CODE_ARTICLES =
  'КМҶ моддаи 220, Қонуни ҶТ «Дар бораи суғуртаи иҷтимоии давлатӣ» моддаи 16';

export const FUNERAL_ALLOWANCE_GOVERNMENT_RESOLUTION =
  'ПҚҶ дар бораи тартиб ва шартҳои пардохти кумакпулӣ барои дафн ба оилаи камбағал';

/** Меъёри умруи кумакпулӣ (20× нишондиҳанда) */
export const FUNERAL_ALLOWANCE_MULTIPLIER = 20;

/** Нишондиҳандаи ҳисоб мувофиқи қонуни буҷет (сол) */
export const CALCULATION_INDICATOR_BY_YEAR: Record<number, number> = {
  2023: 68,
  2024: 72,
  2025: 75,
  2026: 78,
};

export function getCalculationIndicatorForDate(date: string): number {
  const year = Number.parseInt(date.slice(0, 7).slice(0, 4), 10);
  if (Number.isFinite(year) && CALCULATION_INDICATOR_BY_YEAR[year] !== undefined) {
    return CALCULATION_INDICATOR_BY_YEAR[year];
  }
  const years = Object.keys(CALCULATION_INDICATOR_BY_YEAR)
    .map(Number)
    .sort((a, b) => b - a);
  return CALCULATION_INDICATOR_BY_YEAR[years[0] ?? 2025] ?? 75;
}

export type FuneralAllowanceBreakdown = {
  indicator: number;
  multiplier: number;
  amount: number;
  caseType: FuneralAllowanceCaseType;
  paymentSource: FuneralAllowancePaymentSource;
};

export function calcFuneralAllowanceBreakdown(
  paymentDate: string,
  caseType: FuneralAllowanceCaseType,
  paymentSource: FuneralAllowancePaymentSource,
  multiplier = FUNERAL_ALLOWANCE_MULTIPLIER
): FuneralAllowanceBreakdown {
  const indicator = getCalculationIndicatorForDate(paymentDate);
  const safeMultiplier = multiplier > 0 ? multiplier : FUNERAL_ALLOWANCE_MULTIPLIER;
  return {
    indicator,
    multiplier: safeMultiplier,
    amount: indicator * safeMultiplier,
    caseType,
    paymentSource,
  };
}

export function formatFuneralAllowanceAmount(amount: number): string {
  return formatAmount(amount);
}

export function funeralAllowancePayForEmployee(
  allowances: FuneralAllowance[] | undefined,
  month: string,
  employeeId: string
): number {
  return (allowances ?? []).reduce((sum, item) => {
    if (item.paymentSource !== 'employer_budget') return sum;
    if (!item.payeeEmployeeId || item.payeeEmployeeId !== employeeId) return sum;
    if (item.paymentDate.slice(0, 7) !== month) return sum;
    return sum + (parseAmount(item.amount) ?? 0);
  }, 0);
}

export function createFuneralAllowance(): FuneralAllowance {
  const today = new Date().toISOString().slice(0, 10);
  const breakdown = calcFuneralAllowanceBreakdown(
    today,
    'dependent_death',
    'social_insurance'
  );
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `funeral-${Date.now()}`,
    preparedAt: today,
    orderNumber: '',
    caseType: 'dependent_death',
    paymentSource: 'social_insurance',
    deceasedFullName: '',
    deceasedRelation: 'parent',
    deathDate: today,
    department: '',
    position: '',
    paymentDate: today,
    calculationIndicator: breakdown.indicator,
    multiplier: breakdown.multiplier,
    amount: formatFuneralAllowanceAmount(breakdown.amount),
    legalBasis: FUNERAL_ALLOWANCE_LABOR_CODE_ARTICLES,
  };
}

export function applyFuneralAmountFromLaw(draft: FuneralAllowance): FuneralAllowance {
  const breakdown = calcFuneralAllowanceBreakdown(
    draft.paymentDate || draft.preparedAt,
    draft.caseType,
    draft.paymentSource,
    draft.multiplier ?? FUNERAL_ALLOWANCE_MULTIPLIER
  );
  return {
    ...draft,
    calculationIndicator: breakdown.indicator,
    multiplier: breakdown.multiplier,
    amount: formatFuneralAllowanceAmount(breakdown.amount),
  };
}

export function funeralAllowanceMonthKey(paymentDate: string): string {
  return paymentDate.slice(0, 7);
}
