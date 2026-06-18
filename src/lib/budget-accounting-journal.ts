import {
  NYAH_BANK_ACCOUNT,
  NYAH_CASH_ACCOUNT,
  NYAH_CURRENT_EXPENSE_ACCOUNT,
  NYAH_FOOD_EXPENSE_ACCOUNT,
  NYAH_FOOD_INVENTORY_ACCOUNT,
  NYAH_PARENT_FOOD_REVENUE_ACCOUNT,
  NYAH_PARENT_MEMBERSHIP_REVENUE_ACCOUNT,
  NYAH_PARENT_SETTLEMENT_BUDGET,
  normalizeAccountCode,
} from '@/lib/budget-unified-chart-of-accounts';
import { isBudgetFundedOrganization } from '@/lib/organization-scope';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  BudgetAccountingJournalEntry,
  BudgetAccountingJournalLine,
  BudgetAccountingSettings,
  OrganizationSectionContent,
} from '@/types/organization-section';

export const BUDGET_ACCOUNTING_RULES = [
  'Ҳар амалиёт бояд бо сабтҳои дутарафа (дебет = кредит) ба қайд гирифта шавад.',
  'Ҷадвали амалиётҳо мувофиқи шакли мемориалӣ тартиб дода мешавад: № сабт, сана, ҳуҷҷат, мундариҷа, дебет, кредит, маблағ.',
  'Ҳисобҳои синфи 1 ва 5 — актив; синфи 2, 3 ва 4 — пассив (мувофиқи НЯҲ).',
  'Маблағҳои махсуси ғайрибуҷетӣ бояд ҷудогона дар ҳисобҳои 2 11 120 ва 4 12 120 қайд шаванд.',
  'Ҳисоботҳо мувофиқи шаклҳои №1–№6 (Дастурамал №204) тартиб дода мешаванд.',
] as const;

export function supportsBudgetAccounting(organizationId?: string): boolean {
  return isBudgetFundedOrganization(organizationId);
}

export type MemorialCorrespondence = {
  debitAccount: string;
  creditAccount: string;
  amount: number;
};

/** Табдили сабтҳои дутарафа ба мувофиқаҳои мемориалӣ (Дт — Кт — маблағ) */
export function entryToMemorialRows(entry: BudgetAccountingJournalEntry): MemorialCorrespondence[] {
  const debits = entry.lines
    .filter((line) => line.debit > 0)
    .map((line) => ({ accountCode: normalizeAccountCode(line.accountCode), amount: line.debit }));
  const credits = entry.lines
    .filter((line) => line.credit > 0)
    .map((line) => ({
      accountCode: normalizeAccountCode(line.accountCode),
      remaining: line.credit,
    }));

  const rows: MemorialCorrespondence[] = [];
  for (const debit of debits) {
    let remaining = debit.amount;
    for (const credit of credits) {
      if (remaining <= 0) break;
      if (credit.remaining <= 0) continue;
      const amount = Math.min(remaining, credit.remaining);
      rows.push({
        debitAccount: debit.accountCode,
        creditAccount: credit.accountCode,
        amount,
      });
      remaining -= amount;
      credit.remaining -= amount;
    }
  }
  return rows;
}

export function formatEntryDocument(entry: BudgetAccountingJournalEntry): string {
  const parts: string[] = [];
  if (entry.documentType?.trim()) parts.push(entry.documentType.trim());
  if (entry.documentNumber?.trim()) parts.push(`№ ${entry.documentNumber.trim()}`);
  return parts.join(' ');
}

export type BudgetOperationTemplate = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  documentTypeKey: string;
  buildLines: (amount: number) => BudgetAccountingJournalLine[];
};

export const BUDGET_OPERATION_TEMPLATES: BudgetOperationTemplate[] = [
  {
    id: 'budget-receipt',
    labelKey: 'nyahOpBudgetReceipt',
    descriptionKey: 'nyahOpBudgetReceiptDesc',
    documentTypeKey: 'nyahDocBudgetNotice',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: '4 19 000', debit: 0, credit: amount },
    ],
  },
  {
    id: 'treasury-financing',
    labelKey: 'nyahOpTreasuryFinancing',
    descriptionKey: 'nyahOpTreasuryFinancingDesc',
    documentTypeKey: 'nyahDocBudgetNotice',
    buildLines: (amount) => [
      { accountCode: '1 11 254', debit: amount, credit: 0 },
      { accountCode: '2 11 950', debit: 0, credit: amount },
    ],
  },
  {
    id: 'parent-membership-receipt',
    labelKey: 'nyahOpParentMembershipReceipt',
    descriptionKey: 'nyahOpParentMembershipReceiptDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_PARENT_MEMBERSHIP_REVENUE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'parent-food-receipt',
    labelKey: 'nyahOpParentFoodReceipt',
    descriptionKey: 'nyahOpParentFoodReceiptDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_PARENT_FOOD_REVENUE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'food-purchase',
    labelKey: 'nyahOpFoodPurchase',
    descriptionKey: 'nyahOpFoodPurchaseDesc',
    documentTypeKey: 'nyahDocInvoice',
    buildLines: (amount) => [
      { accountCode: NYAH_FOOD_INVENTORY_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'food-consumption',
    labelKey: 'nyahOpFoodConsumption',
    descriptionKey: 'nyahOpFoodConsumptionDesc',
    documentTypeKey: 'nyahDocRequirement',
    buildLines: (amount) => [
      { accountCode: NYAH_FOOD_EXPENSE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_FOOD_INVENTORY_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'material-receipt',
    labelKey: 'nyahOpMaterialReceipt',
    descriptionKey: 'nyahOpMaterialReceiptDesc',
    documentTypeKey: 'nyahDocInvoice',
    buildLines: (amount) => [
      { accountCode: '1 31 212', debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'payroll-accrual',
    labelKey: 'nyahOpPayrollAccrual',
    descriptionKey: 'nyahOpPayrollAccrualDesc',
    documentTypeKey: 'nyahDocPayroll',
    buildLines: (amount) => [
      { accountCode: '5 12 110', debit: amount, credit: 0 },
      { accountCode: NYAH_PARENT_SETTLEMENT_BUDGET, debit: 0, credit: amount },
    ],
  },
  {
    id: 'payroll-payment',
    labelKey: 'nyahOpPayrollPayment',
    descriptionKey: 'nyahOpPayrollPaymentDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    buildLines: (amount) => [
      { accountCode: NYAH_PARENT_SETTLEMENT_BUDGET, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'grant-receipt',
    labelKey: 'nyahOpGrantReceipt',
    descriptionKey: 'nyahOpGrantReceiptDesc',
    documentTypeKey: 'nyahDocBudgetNotice',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: '4 18 310', debit: 0, credit: amount },
    ],
  },
  {
    id: 'tax-payment',
    labelKey: 'nyahOpTaxPayment',
    descriptionKey: 'nyahOpTaxPaymentDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    buildLines: (amount) => [
      { accountCode: '5 22 540', debit: amount, credit: 0 },
      { accountCode: '2 11 690', debit: 0, credit: amount },
    ],
  },
  {
    id: 'cash-to-bank',
    labelKey: 'nyahOpCashToBank',
    descriptionKey: 'nyahOpCashToBankDesc',
    documentTypeKey: 'nyahDocCashOrder',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_CASH_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'bank-to-cash',
    labelKey: 'nyahOpBankToCash',
    descriptionKey: 'nyahOpBankToCashDesc',
    documentTypeKey: 'nyahDocCashOrder',
    buildLines: (amount) => [
      { accountCode: NYAH_CASH_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'fixed-asset-purchase',
    labelKey: 'nyahOpFixedAssetPurchase',
    descriptionKey: 'nyahOpFixedAssetPurchaseDesc',
    documentTypeKey: 'nyahDocInvoice',
    buildLines: (amount) => [
      { accountCode: '1 41 300', debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'depreciation',
    labelKey: 'nyahOpDepreciation',
    descriptionKey: 'nyahOpDepreciationDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    buildLines: (amount) => [
      { accountCode: NYAH_CURRENT_EXPENSE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: '1 42 300', debit: 0, credit: amount },
    ],
  },
  {
    id: 'product-sale',
    labelKey: 'nyahOpProductSale',
    descriptionKey: 'nyahOpProductSaleDesc',
    documentTypeKey: 'nyahDocInvoice',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: '4 12 110', debit: 0, credit: amount },
    ],
  },
];

export function defaultBudgetAccountingSettings(): BudgetAccountingSettings {
  const year = new Date().getFullYear();
  return {
    fiscalYear: String(year),
    nextEntryNumber: 1,
  };
}

export function resolveBudgetAccountingSettings(
  financeContent: OrganizationSectionContent
): BudgetAccountingSettings {
  return {
    ...defaultBudgetAccountingSettings(),
    ...financeContent.budgetAccountingSettings,
  };
}

export function formatJournalAmount(value: number): string {
  return formatAmount(value);
}

export function parseJournalAmount(value: string): number {
  return parseAmount(value) ?? 0;
}

export function journalEntryTotal(entry: BudgetAccountingJournalEntry): number {
  return entry.lines.reduce((sum, line) => sum + line.debit, 0);
}

export function validateJournalEntry(entry: BudgetAccountingJournalEntry): string | null {
  if (!entry.date) return 'nyahErrorDateRequired';
  if (!entry.description?.trim()) return 'nyahErrorDescriptionRequired';
  if (entry.lines.length < 2) return 'nyahErrorMinTwoLines';

  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of entry.lines) {
    if (!line.accountCode?.trim()) return 'nyahErrorAccountRequired';
    if (line.debit < 0 || line.credit < 0) return 'nyahErrorNegativeAmount';
    if (line.debit > 0 && line.credit > 0) return 'nyahErrorBothSides';
    if (line.debit === 0 && line.credit === 0) return 'nyahErrorZeroLine';
    debitTotal += line.debit;
    creditTotal += line.credit;
  }

  if (Math.abs(debitTotal - creditTotal) > 0.009) return 'nyahErrorUnbalanced';
  if (debitTotal <= 0) return 'nyahErrorZeroAmount';
  return null;
}

export function normalizeJournalLines(
  lines: BudgetAccountingJournalLine[]
): BudgetAccountingJournalLine[] {
  return lines.map((line) => ({
    ...line,
    accountCode: normalizeAccountCode(line.accountCode),
  }));
}

export function upsertBudgetJournalEntry(
  entries: BudgetAccountingJournalEntry[] | undefined,
  entry: BudgetAccountingJournalEntry
): BudgetAccountingJournalEntry[] {
  const rest = (entries ?? []).filter((item) => item.id !== entry.id);
  return [...rest, entry].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.entryNumber - b.entryNumber;
  });
}

export function removeBudgetJournalEntry(
  entries: BudgetAccountingJournalEntry[] | undefined,
  entryId: string
): BudgetAccountingJournalEntry[] {
  return (entries ?? []).filter((item) => item.id !== entryId);
}

export type AccountTurnover = {
  accountCode: string;
  debitTurnover: number;
  creditTurnover: number;
  balance: number;
};

export function computeAccountTurnover(
  entries: BudgetAccountingJournalEntry[] | undefined,
  fiscalYear?: string
): AccountTurnover[] {
  const map = new Map<string, { debit: number; credit: number }>();

  for (const entry of entries ?? []) {
    if (fiscalYear && !entry.date.startsWith(fiscalYear)) continue;
    for (const line of entry.lines) {
      const code = normalizeAccountCode(line.accountCode);
      const current = map.get(code) ?? { debit: 0, credit: 0 };
      current.debit += line.debit;
      current.credit += line.credit;
      map.set(code, current);
    }
  }

  return [...map.entries()]
    .map(([accountCode, totals]) => ({
      accountCode,
      debitTurnover: totals.debit,
      creditTurnover: totals.credit,
      balance: totals.debit - totals.credit,
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export function nextJournalEntryNumber(
  settings: BudgetAccountingSettings,
  entries: BudgetAccountingJournalEntry[] | undefined
): number {
  const fromSettings = settings.nextEntryNumber ?? 1;
  const maxExisting = (entries ?? []).reduce(
    (max, entry) => Math.max(max, entry.entryNumber),
    0
  );
  return Math.max(fromSettings, maxExisting + 1);
}

export function budgetAccountingFileName(fiscalYear: string): string {
  return `nyah-amaliotho-${fiscalYear}`;
}

export function findOperationTemplate(id: string): BudgetOperationTemplate | undefined {
  return BUDGET_OPERATION_TEMPLATES.find((item) => item.id === id);
}
