/**
 * Дигар боздоштҳо аз музди меҳнат — пеш ва баъд аз андозбандӣ.
 * Кодекси андози ҶТ (андоз аз даромади шахсони воқеӣ); КМҶ моддаҳои 169, 170 (боздошт аз музди меҳнат).
 */

import { parseAmount } from '@/lib/staff-table-calc';
import {
  OrganizationSectionContent,
  PayrollLedger,
  PayrollLedgerEntry,
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
