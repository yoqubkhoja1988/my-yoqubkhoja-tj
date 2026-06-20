/**
 * Дигар боздоштҳо аз музди меҳнат — пеш ва баъд аз андозбандӣ.
 * Кодекси андози ҶТ (андоз аз даромади шахсони воқеӣ); КМҶ моддаҳои 169, 170 (боздошт аз музди меҳнат).
 */

import { parseAmount } from '@/lib/staff-table-calc';
import { currentMonthKey } from '@/lib/staff-timesheet';
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
  const [year, mon] = month.split('-').map(Number);
  const date = new Date(year, mon, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function assignmentMonthsAffected(
  assignment: PayrollWithholdingAssignment,
  existingLedgerMonths: string[] = []
): string[] {
  const months = new Set<string>();
  const end = assignment.effectiveTo ?? currentMonthKey();
  if (assignment.effectiveFrom && assignment.effectiveFrom <= end) {
    let cursor = assignment.effectiveFrom;
    while (cursor <= end) {
      months.add(cursor);
      cursor = addMonth(cursor);
    }
  }
  for (const month of existingLedgerMonths) {
    if (assignmentAppliesToMonth(assignment, month)) months.add(month);
  }
  return [...months].sort();
}

export function mergeAssignmentWithholdings(
  entry: PayrollLedgerEntry,
  assignments: PayrollWithholdingAssignment[] | undefined,
  month: string,
  types: PayrollWithholdingType[]
): PayrollLedgerEntry {
  const applicable = assignmentsForEmployeeMonth(assignments, entry.employeeId, month);
  if (applicable.length === 0) return entry;

  const enabledTypeIds = new Set(types.map((type) => type.id));
  const amounts = { ...(entry.withholdingAmounts ?? {}) };

  for (const assignment of applicable) {
    if (!enabledTypeIds.has(assignment.withholdingTypeId)) continue;
    const amount = assignment.amount.trim();
    if (!amount) continue;
    if (assignment.withholdingTypeId in amounts) continue;
    amounts[assignment.withholdingTypeId] = amount;
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
