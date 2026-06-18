import { isKindergartenOrganization } from '@/lib/organization-scope';
import {
  NYAH_BANK_ACCOUNT,
  NYAH_FOOD_EXPENSE_ACCOUNT,
  NYAH_FOOD_INVENTORY_ACCOUNT,
  NYAH_PARENT_FOOD_REVENUE_ACCOUNT,
  NYAH_LEGAL_BASIS,
} from '@/lib/budget-unified-chart-of-accounts';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  OrganizationSectionContent,
  ParentFoodPayment,
  ParentFoodPaymentSettings,
  ParentFoodPaymentStatus,
  PreschoolEnrollee,
} from '@/types/organization-section';
import {
  activePreschoolEnrollees,
  currentSchoolYear,
} from '@/lib/finance-parent-membership-fee';

export const PARENT_FOOD_PAYMENT_ACCOUNT_INDICATORS = [
  {
    code: NYAH_PARENT_FOOD_REVENUE_ACCOUNT,
    labelKey: 'parentFoodPaymentAccountRevenue',
    role: 'revenue' as const,
    description:
      'Даромад аз пардохти волидон барои таъмини тарбиятгирандагон бо хурок (гурӯҳи иқтисодии 2723)',
  },
  {
    code: NYAH_FOOD_INVENTORY_ACCOUNT,
    labelKey: 'parentFoodPaymentAccountInventory',
    role: 'inventory' as const,
    description: 'Махсулоти хурока — харид ва истеъмол (шакли №3, сатр 060)',
  },
] as const;

export const PARENT_FOOD_PAYMENT_LEGAL_BASIS = [
  'Қонуни ҶТ «Дар бораи таълиму тарбияи томактабӣ» — моддаи 22 (ташкили ғизодиҳӣ)',
  'Қонуни ҶТ «Дар бораи таълиму тарбияи томактабӣ» — моддаи 23 (манбаъҳои иловагии маблағгузорӣ)',
  ...NYAH_LEGAL_BASIS,
] as const;

export const PARENT_FOOD_PAYMENT_RULES = [
  'Пардохти хурок аз ҳисоби падару модари тарбиятгирандагон мувофиқи меъёрҳои тасдиқшудаи Вазорати тандурустӣ ва Вазорати маориф ва илм ҷамъоварӣ мешавад.',
  'Ҷамъоварӣ танҳо ба суратҳисоби махсуси муассиса (ғайрибуҷетӣ) ва бо ҳуҷҷатҳои расмӣ сурат мегирад.',
  'Маблағҳои ҷамъшуда бояд танҳо барои харид ва таъмини маводи хурока (ҳисоби 1 31 214) истифода шаванд.',
  'Ҳисобот оид ба даромад (4 12 120) ва хароҷоти хурок шаффоф бошад.',
] as const;

export const DEFAULT_MEAL_DAYS_PER_MONTH = 22;

export function supportsParentFoodPayment(organizationId?: string): boolean {
  return isKindergartenOrganization(organizationId);
}

export function defaultParentFoodPaymentSettings(): ParentFoodPaymentSettings {
  return {
    schoolYear: currentSchoolYear(),
    dailyFoodRateSomoni: 0,
    mealDaysPerMonth: DEFAULT_MEAL_DAYS_PER_MONTH,
    revenueAccountCode: PARENT_FOOD_PAYMENT_ACCOUNT_INDICATORS[0].code,
    inventoryAccountCode: PARENT_FOOD_PAYMENT_ACCOUNT_INDICATORS[1].code,
  };
}

export function resolveParentFoodPaymentSettings(
  financeContent: OrganizationSectionContent
): ParentFoodPaymentSettings {
  return {
    ...defaultParentFoodPaymentSettings(),
    ...financeContent.parentFoodPaymentSettings,
  };
}

export function formatFoodAmount(value: number): string {
  return formatAmount(value);
}

export function parseFoodAmount(value: string): number {
  return parseAmount(value) ?? 0;
}

export function foodPaymentPeriod(month: string): string {
  return month;
}

export function expectedFoodAmount(
  settings: ParentFoodPaymentSettings,
  enrollee: PreschoolEnrollee,
  mealDays?: number
): number {
  if (enrollee.active === false) return 0;
  const days = mealDays ?? settings.mealDaysPerMonth;
  return Math.max(0, settings.dailyFoodRateSomoni * days);
}

export function findFoodPayment(
  payments: ParentFoodPayment[] | undefined,
  enrolleeId: string,
  period: string
): ParentFoodPayment | undefined {
  return (payments ?? []).find(
    (payment) => payment.enrolleeId === enrolleeId && payment.period === period
  );
}

export function upsertParentFoodPayment(
  payments: ParentFoodPayment[] | undefined,
  payment: ParentFoodPayment
): ParentFoodPayment[] {
  const rest = (payments ?? []).filter(
    (item) => !(item.enrolleeId === payment.enrolleeId && item.period === payment.period)
  );
  return [...rest, payment];
}

export function removeParentFoodPayment(
  payments: ParentFoodPayment[] | undefined,
  paymentId: string
): ParentFoodPayment[] {
  return (payments ?? []).filter((item) => item.id !== paymentId);
}

export type ParentFoodPaymentSummary = {
  activeEnrollees: number;
  expectedTotal: number;
  paidTotal: number;
  pendingTotal: number;
  exemptCount: number;
  paidCount: number;
  pendingCount: number;
  mealDays: number;
};

export function summarizeParentFoodPayments(
  settings: ParentFoodPaymentSettings,
  enrollees: PreschoolEnrollee[] | undefined,
  payments: ParentFoodPayment[] | undefined,
  period: string
): ParentFoodPaymentSummary {
  const active = activePreschoolEnrollees(enrollees);
  let expectedTotal = 0;
  let paidTotal = 0;
  let pendingTotal = 0;
  let exemptCount = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const enrollee of active) {
    const payment = findFoodPayment(payments, enrollee.id, period);
    const mealDays = payment?.mealDays ?? settings.mealDaysPerMonth;
    const expected = expectedFoodAmount(settings, enrollee, mealDays);
    expectedTotal += expected;

    if (!payment || payment.status === 'pending') {
      pendingTotal += expected;
      pendingCount += 1;
      continue;
    }
    if (payment.status === 'exempt') {
      exemptCount += 1;
      continue;
    }
    paidTotal += payment.amount;
    paidCount += 1;
  }

  return {
    activeEnrollees: active.length,
    expectedTotal,
    paidTotal,
    pendingTotal,
    exemptCount,
    paidCount,
    pendingCount,
    mealDays: settings.mealDaysPerMonth,
  };
}

export type FoodPaymentJournalEntry = {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  descriptionKey: string;
};

export function buildFoodPaymentJournalEntries(
  settings: ParentFoodPaymentSettings,
  paidTotal: number
): FoodPaymentJournalEntry[] {
  if (paidTotal <= 0) return [];

  return [
    {
      debitAccount: `${NYAH_BANK_ACCOUNT}`,
      creditAccount: settings.revenueAccountCode || NYAH_PARENT_FOOD_REVENUE_ACCOUNT,
      amount: paidTotal,
      descriptionKey: 'parentFoodPaymentJournalReceipt',
    },
    {
      debitAccount: NYAH_FOOD_EXPENSE_ACCOUNT,
      creditAccount: settings.inventoryAccountCode || NYAH_FOOD_INVENTORY_ACCOUNT,
      amount: paidTotal,
      descriptionKey: 'parentFoodPaymentJournalExpense',
    },
  ];
}

export function parentFoodPaymentFileName(period: string): string {
  return `pardokhti-hurok-volidon-${period.replace(/[^\d-]+/g, '-')}`;
}

export function foodPaymentStatusLabel(
  status: ParentFoodPaymentStatus,
  t: (key: string) => string
): string {
  switch (status) {
    case 'paid':
      return t('parentFoodPaymentStatusPaid');
    case 'exempt':
      return t('parentFoodPaymentStatusExempt');
    default:
      return t('parentFoodPaymentStatusPending');
  }
}
