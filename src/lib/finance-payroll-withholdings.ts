/**
 * Дигар боздоштҳо аз музди меҳнат — пеш ва баъд аз андозбандӣ.
 * Кодекси андози ҶТ (андоз аз даромади шахсони воқеӣ); КМҶ моддаҳои 169, 170 (боздошт аз музди меҳнат).
 */

import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import { currentMonthKey, isValidMonthKey, shiftMonth } from '@/lib/staff-timesheet';
import {
  OrganizationSectionContent,
  PayrollLedger,
  PayrollLedgerEntry,
  PayrollWithholdingAssignment,
  PayrollWithholdingType,
} from '@/types/organization-section';

export type PayrollWithholdingTiming = PayrollWithholdingType['timing'];

export const PAYROLL_WITHHOLDING_LEGAL_BASIS = {
  taxCode:
    'Кодекси андози Ҷумҳурии Тоҷикистон — асоси ҳисобкунии андоз аз даромади шахсони воқеӣ',
  laborCode:
    'Кодекси меҳнати Ҷумҳурии Тоҷикистон — моддаҳои 169, 170 (боздошт аз музди меҳнат)',
  familyCode:
    'Кодекси оилаи Ҷумҳурии Тоҷикистон — алимент ва боздоштҳои судӣ',
} as const;

export const PAYROLL_WITHHOLDING_PRESETS: Array<
  Pick<PayrollWithholdingType, 'name' | 'timing' | 'legalBasis'>
> = [
  {
    name: 'Боздоштҳои пеш аз андоз (асоси андоз)',
    timing: 'pre_tax',
    legalBasis: PAYROLL_WITHHOLDING_LEGAL_BASIS.taxCode,
  },
  {
    name: 'Алимент',
    timing: 'post_tax',
    legalBasis: PAYROLL_WITHHOLDING_LEGAL_BASIS.familyCode,
  },
  {
    name: 'Қарзи меҳнатӣ / боздошти судӣ',
    timing: 'post_tax',
    legalBasis: PAYROLL_WITHHOLDING_LEGAL_BASIS.laborCode,
  },
];

export function resolvePayrollWithholdings(
  content: Pick<OrganizationSectionContent, 'payrollWithholdingTypes'>
): PayrollWithholdingType[] {
  return (content.payrollWithholdingTypes ?? []).filter((item) => item.enabled);
}

export function withholdingAmount(
  entry: PayrollLedgerEntry,
  typeId: string
): number {
  return parseAmount(entry.withholdingAmounts?.[typeId] ?? '') ?? 0;
}

export function sumWithholdingsByTiming(
  entry: PayrollLedgerEntry,
  types: PayrollWithholdingType[],
  timing: PayrollWithholdingTiming
): number {
  return types
    .filter((type) => type.timing === timing)
    .reduce((sum, type) => sum + withholdingAmount(entry, type.id), 0);
}

/** Маблағи дигар боздоштҳо (пеш + баъд аз андоз) барои ҳисобот ва мемориалӣ */
export function totalOtherWithholdings(
  entry: PayrollLedgerEntry,
  types: PayrollWithholdingType[]
): number {
  const fromTypes =
    sumWithholdingsByTiming(entry, types, 'pre_tax') +
    sumWithholdingsByTiming(entry, types, 'post_tax');
  if (fromTypes > 0) return fromTypes;
  return parseAmount(entry.otherDeductions ?? '') ?? 0;
}

export function migrateLegacyOtherDeductions(
  entry: PayrollLedgerEntry,
  types: PayrollWithholdingType[]
): PayrollLedgerEntry {
  const legacy = parseAmount(entry.otherDeductions ?? '') ?? 0;
  if (legacy <= 0 || Object.keys(entry.withholdingAmounts ?? {}).length > 0) {
    return entry;
  }

  const postType = types.find((type) => type.timing === 'post_tax');
  if (!postType) return entry;

  return {
    ...entry,
    withholdingAmounts: {
      ...(entry.withholdingAmounts ?? {}),
      [postType.id]: entry.otherDeductions ?? '',
    },
  };
}

export function ledgerHasWithholdingAmount(
  ledger: PayrollLedger,
  typeId: string
): boolean {
  return ledger.entries.some((entry) => withholdingAmount(entry, typeId) > 0);
}

/** Сутун дар китоби музди меҳнат — танҳо агар боздошт ҳисоб шуда бошад ё ҳангоми таҳрир */
export function visiblePayrollWithholdings(
  types: PayrollWithholdingType[],
  ledger: PayrollLedger,
  editing: boolean
): PayrollWithholdingType[] {
  if (editing) return types;
  return types.filter((type) => ledgerHasWithholdingAmount(ledger, type.id));
}

export function splitVisiblePayrollWithholdings(
  types: PayrollWithholdingType[],
  ledger: PayrollLedger,
  editing: boolean
): { preTax: PayrollWithholdingType[]; postTax: PayrollWithholdingType[] } {
  const visible = visiblePayrollWithholdings(types, ledger, editing);
  return {
    preTax: visible.filter((type) => type.timing === 'pre_tax'),
    postTax: visible.filter((type) => type.timing === 'post_tax'),
  };
}

export function newWithholdingType(
  name: string,
  timing: PayrollWithholdingTiming,
  legalBasis: string
): PayrollWithholdingType {
  return {
    id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    timing,
    legalBasis,
    enabled: true,
  };
}

export function createPayrollWithholdingAssignment(): PayrollWithholdingAssignment {
  const month = currentMonthKey();
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `wha-${Date.now()}`,
    employeeId: '',
    withholdingTypeId: '',
    amount: '',
    effectiveFrom: month,
    preparedAt: new Date().toISOString().slice(0, 10),
  };
}

export function assignmentAppliesToMonth(
  assignment: PayrollWithholdingAssignment,
  month: string
): boolean {
  if (!assignment.employeeId || !assignment.withholdingTypeId) return false;
  if (month < assignment.effectiveFrom) return false;
  if (assignment.effectiveTo && month > assignment.effectiveTo) return false;
  return true;
}

export function assignmentsForEmployeeMonth(
  assignments: PayrollWithholdingAssignment[] | undefined,
  employeeId: string,
  month: string
): PayrollWithholdingAssignment[] {
  return (assignments ?? []).filter(
    (item) => item.employeeId === employeeId && assignmentAppliesToMonth(item, month)
  );
}

function addMonth(month: string): string {
  return shiftMonth(month, 1);
}

export function assignmentMonthsAffected(
  assignment: PayrollWithholdingAssignment,
  existingLedgerMonths: string[] = []
): string[] {
  const months = new Set<string>();
  const end = assignment.effectiveTo ?? currentMonthKey();
  const from = assignment.effectiveFrom;

  if (
    from &&
    isValidMonthKey(from) &&
    isValidMonthKey(end) &&
    from <= end
  ) {
    let cursor = from;
    let guard = 0;

    while (cursor <= end && guard < 600) {
      months.add(cursor);
      if (cursor === end) break;
      cursor = addMonth(cursor);
      guard += 1;
    }
  }
  for (const month of existingLedgerMonths) {
    if (assignmentAppliesToMonth(assignment, month)) months.add(month);
  }
  return [...months].sort();
}

export function parseWithholdingPercent(amount: string): number | null {
  const trimmed = amount.trim();
  if (!trimmed.endsWith('%')) return null;

  const value = parseAmount(trimmed.slice(0, -1).trim());
  if (value === null || value < 0) return null;
  return value;
}

export function isPercentWithholdingAmount(amount: string): boolean {
  return parseWithholdingPercent(amount) !== null;
}

/** Маблағи боздошт — фоиз аз «Ҳамагӣ» ё маблағи фикс */
export function resolveWithholdingAssignmentAmount(amount: string, hamagi: number): number {
  const percent = parseWithholdingPercent(amount);
  if (percent !== null) {
    return Math.max(0, hamagi * (percent / 100));
  }
  return parseAmount(amount) ?? 0;
}

/** «Ҳамагӣ» барои боздоштҳои фоизии пеш аз андоз (ҳалли мавқеи doiraӣ) */
export function resolveHamagiForWithholdingAssignments(
  rawGross: number,
  entry: PayrollLedgerEntry,
  assignments: PayrollWithholdingAssignment[] | undefined,
  month: string,
  types: PayrollWithholdingType[]
): number {
  if (rawGross <= 0) return 0;

  const applicable = assignmentsForEmployeeMonth(assignments, entry.employeeId, month);
  const typeById = new Map(types.map((type) => [type.id, type]));
  let fixedPreTax = 0;
  let percentPreTaxSum = 0;

  for (const assignment of applicable) {
    const type = typeById.get(assignment.withholdingTypeId);
    if (!type || type.timing !== 'pre_tax') continue;
    const percent = parseWithholdingPercent(assignment.amount);
    if (percent !== null) {
      percentPreTaxSum += percent;
    } else {
      fixedPreTax += parseAmount(assignment.amount) ?? 0;
    }
  }

  for (const type of types) {
    if (type.timing !== 'pre_tax') continue;
    if (applicable.some((item) => item.withholdingTypeId === type.id)) continue;
    fixedPreTax += parseAmount(entry.withholdingAmounts?.[type.id] ?? '') ?? 0;
  }

  if (percentPreTaxSum >= 100) return 0;
  return Math.max(0, (rawGross - fixedPreTax) / (1 + percentPreTaxSum / 100));
}

export function mergeAssignmentWithholdings(
  entry: PayrollLedgerEntry,
  assignments: PayrollWithholdingAssignment[] | undefined,
  month: string,
  types: PayrollWithholdingType[],
  rawGross = 0
): PayrollLedgerEntry {
  const applicable = assignmentsForEmployeeMonth(assignments, entry.employeeId, month);
  if (applicable.length === 0) return entry;

  const enabledTypeIds = new Set(types.map((type) => type.id));
  const amounts = { ...(entry.withholdingAmounts ?? {}) };
  const hamagi = resolveHamagiForWithholdingAssignments(
    rawGross,
    entry,
    assignments,
    month,
    types
  );

  for (const assignment of applicable) {
    if (!enabledTypeIds.has(assignment.withholdingTypeId)) continue;
    const trimmed = assignment.amount.trim();
    if (!trimmed) continue;

    const isPercent = isPercentWithholdingAmount(trimmed);
    if (!isPercent && assignment.withholdingTypeId in amounts) continue;

    amounts[assignment.withholdingTypeId] = formatAmount(
      resolveWithholdingAssignmentAmount(trimmed, hamagi)
    );
  }

  return { ...entry, withholdingAmounts: amounts };
}

export function upsertPayrollWithholdingAssignment(
  assignments: PayrollWithholdingAssignment[] | undefined,
  assignment: PayrollWithholdingAssignment
): PayrollWithholdingAssignment[] {
  const rest = (assignments ?? []).filter((item) => item.id !== assignment.id);
  return [...rest, assignment];
}

export function removePayrollWithholdingAssignment(
  assignments: PayrollWithholdingAssignment[] | undefined,
  id: string
): PayrollWithholdingAssignment[] {
  return (assignments ?? []).filter((item) => item.id !== id);
}

export function sortPayrollWithholdingAssignments(
  assignments: PayrollWithholdingAssignment[] | undefined
): PayrollWithholdingAssignment[] {
  return [...(assignments ?? [])].sort((a, b) => {
    const from = a.effectiveFrom.localeCompare(b.effectiveFrom);
    if (from !== 0) return from;
    return (a.preparedAt ?? '').localeCompare(b.preparedAt ?? '');
  });
}
