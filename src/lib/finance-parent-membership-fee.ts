import { isKindergartenOrganization } from '@/lib/organization-scope';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  OrganizationSectionContent,
  ParentMembershipFeePayment,
  ParentMembershipFeePaymentStatus,
  ParentMembershipFeeSettings,
  PreschoolEnrollee,
  StaffEmployee,
} from '@/types/organization-section';

export const PARENT_MEMBERSHIP_FEE_LEGAL_BASIS = [
  'Қонуни ҶТ «Дар бораи таълиму тарбияи томактабӣ» — моддаи 18 (ҳуқуқ ва ӯҳдадориҳои падару модар)',
  'Қонуни ҶТ «Дар бораи маориф» — ташкили кумитаи волидон дар муассисаи таълимӣ',
  'Оинномаи муассиса (Низомномаи намунавии МДТ, Қарори Ҳукумати ҶТ №256, 29.04.2015)',
] as const;

export const PARENT_MEMBERSHIP_FEE_RULES = [
  'Аъзо ҳаққ танҳо тавассути кумитаи волидон ва бо розигии ихтиёрии падару модар ҷамъоварӣ мешавад.',
  'Маъмурияти муассиса на танҳо аз волидон маблағи маҷбурии ғайриқонунӣ талаб намекунад (Қонуни маориф, ҳушдорҳои Вазорати маориф ва илм).',
  'Маблағ, мӯҳлат ва тартиби ҷамъоварӣ бо қарори кумитаи волидон (протокол) муайян карда мешавад.',
  'Ҳисобот оид ба даромад ва харҷи маблағҳои кумитаи волидон бояд шаффоф бошад.',
] as const;

export const DEFAULT_KINDERGARTEN_GROUPS = [
  { groupName: 'Гурӯҳи 1 (хурдсол)', defaultCount: 15 },
  { groupName: 'Гурӯҳи 2 (хурдсол)', defaultCount: 15 },
  { groupName: 'Гурӯҳи 3 (хурдсол)', defaultCount: 15 },
  { groupName: 'Гурӯҳи 4 (хурдсол)', defaultCount: 15 },
  { groupName: 'Гурӯҳи 5 (калонсол)', defaultCount: 14 },
  { groupName: 'Гурӯҳи 6 (калонсол)', defaultCount: 14 },
  { groupName: 'Гурӯҳи 7 (калонсол)', defaultCount: 14 },
  { groupName: 'Гурӯҳи 8 (калонсол)', defaultCount: 14 },
] as const;

export function supportsParentMembershipFee(organizationId?: string): boolean {
  return isKindergartenOrganization(organizationId);
}

export function currentSchoolYear(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 9) {
    return `${year}–${year + 1}`;
  }
  return `${year - 1}–${year}`;
}

export function defaultParentMembershipFeeSettings(): ParentMembershipFeeSettings {
  return {
    schoolYear: currentSchoolYear(),
    periodKind: 'annual',
    feePerChildSomoni: 0,
  };
}

export function resolveParentMembershipFeeSettings(
  financeContent: OrganizationSectionContent
): ParentMembershipFeeSettings {
  return {
    ...defaultParentMembershipFeeSettings(),
    ...financeContent.parentMembershipFeeSettings,
  };
}

export function activePreschoolEnrollees(
  enrollees: PreschoolEnrollee[] | undefined
): PreschoolEnrollee[] {
  return (enrollees ?? []).filter((item) => item.active !== false);
}

export function formatMembershipAmount(value: number): string {
  return formatAmount(value);
}

export function parseMembershipAmount(value: string): number {
  return parseAmount(value) ?? 0;
}

export function paymentPeriodForSettings(
  settings: ParentMembershipFeeSettings,
  month?: string
): string {
  if (settings.periodKind === 'annual') {
    return settings.schoolYear;
  }
  return month ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
}

export function expectedFeeAmount(
  settings: ParentMembershipFeeSettings,
  enrollee: PreschoolEnrollee
): number {
  if (enrollee.active === false) return 0;
  return Math.max(0, settings.feePerChildSomoni);
}

export function findPayment(
  payments: ParentMembershipFeePayment[] | undefined,
  enrolleeId: string,
  period: string
): ParentMembershipFeePayment | undefined {
  return (payments ?? []).find(
    (payment) => payment.enrolleeId === enrolleeId && payment.period === period
  );
}

export function upsertParentMembershipPayment(
  payments: ParentMembershipFeePayment[] | undefined,
  payment: ParentMembershipFeePayment
): ParentMembershipFeePayment[] {
  const rest = (payments ?? []).filter(
    (item) => !(item.enrolleeId === payment.enrolleeId && item.period === payment.period)
  );
  return [...rest, payment];
}

export function removeParentMembershipPayment(
  payments: ParentMembershipFeePayment[] | undefined,
  paymentId: string
): ParentMembershipFeePayment[] {
  return (payments ?? []).filter((item) => item.id !== paymentId);
}

export type ParentMembershipFeeSummary = {
  activeEnrollees: number;
  expectedTotal: number;
  paidTotal: number;
  pendingTotal: number;
  exemptCount: number;
  paidCount: number;
  pendingCount: number;
};

export function summarizeParentMembershipFees(
  settings: ParentMembershipFeeSettings,
  enrollees: PreschoolEnrollee[] | undefined,
  payments: ParentMembershipFeePayment[] | undefined,
  period: string
): ParentMembershipFeeSummary {
  const active = activePreschoolEnrollees(enrollees);
  let expectedTotal = 0;
  let paidTotal = 0;
  let pendingTotal = 0;
  let exemptCount = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const enrollee of active) {
    const expected = expectedFeeAmount(settings, enrollee);
    expectedTotal += expected;
    const payment = findPayment(payments, enrollee.id, period);
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
  };
}

export function educatorOptions(staffContent?: OrganizationSectionContent | null): StaffEmployee[] {
  return (staffContent?.employees ?? []).filter((employee) => {
    const department = employee.department?.toUpperCase() ?? '';
    const position = employee.position?.toLowerCase() ?? '';
    return (
      department.includes('МУРАББИЯ') ||
      position.includes('мурабби') ||
      position.includes('омӯзгор')
    );
  });
}

export function createPlaceholderEnrollees(
  groupName: string,
  count: number,
  educator?: StaffEmployee
): PreschoolEnrollee[] {
  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    groupName,
    childFullName: `Тарбиятгиранда ${index + 1}`,
    parentFullName: '',
    educatorName: educator?.fullName,
    educatorEmployeeId: educator?.id,
    active: true,
  }));
}

export function parentMembershipFeeFileName(schoolYear: string): string {
  return `aozo-haqqi-volidon-${schoolYear.replace(/[^\d-]+/g, '-')}`;
}

export function paymentStatusLabel(
  status: ParentMembershipFeePaymentStatus,
  t: (key: string) => string
): string {
  switch (status) {
    case 'paid':
      return t('parentMembershipFeeStatusPaid');
    case 'exempt':
      return t('parentMembershipFeeStatusExempt');
    default:
      return t('parentMembershipFeeStatusPending');
  }
}
