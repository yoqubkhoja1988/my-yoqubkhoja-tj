export const FINANCE_SECTION_IDS = [
  'finance-stats',
  'finance-budget',
  'finance-payroll',
  'finance-position-handover',
  'finance-payroll-ledger',
  'finance-local-payroll-requirement',
  'finance-bank-payment',
  'finance-labor-leave',
  'finance-maternity-leave',
  'finance-sick-leave',
  'finance-contacts',
] as const;

export type FinanceSectionId = (typeof FINANCE_SECTION_IDS)[number];

export function isFinanceSectionId(value: string): value is FinanceSectionId {
  return (FINANCE_SECTION_IDS as readonly string[]).includes(value);
}

export const DEFAULT_FINANCE_SECTION: FinanceSectionId = 'finance-stats';
