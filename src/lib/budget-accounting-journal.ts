import {
  NYAH_BANK_ACCOUNT,
  NYAH_BUDGET_DEFERRED_REVENUE_LOCAL,
  NYAH_CASH_ACCOUNT,
  NYAH_GRANT_REVENUE_ACCOUNT,
  NYAH_PARENT_FOOD_REVENUE_ACCOUNT,
  NYAH_PARENT_MEMBERSHIP_REVENUE_ACCOUNT,
  NYAH_PAYROLL_PAYABLE_ACCOUNT,
  NYAH_PRODUCT_SALE_REVENUE_ACCOUNT,
  NYAH_SUPPLIER_PAYABLE_ACCOUNT,
  NYAH_TREASURY_INTERNAL_LIABILITY,
  isValidNyahAccountCode,
  normalizeAccountCode,
} from '@/lib/budget-unified-chart-of-accounts';
import {
  BUDGET_MEMORIAL_ORDER_RULES,
  BUDGET_MEMORIAL_ORDER_TEMPLATES,
} from '@/lib/budget-memorial-orders';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  BudgetAccountingJournalEntry,
  BudgetAccountingJournalLine,
  BudgetAccountingSettings,
} from '@/types/organization-section';

export const BUDGET_ACCOUNTING_RULES = [
  'Ҳар амалиёт бояд бо сабтҳои дутарафа (дебет = кредит) ба қайд гирифта шавад.',
  'Ҷадвали амалиётҳо мувофиқи шакли мемориалӣ тартиб дода мешавад: № сабт, сана, ҳуҷҷат, мундариҷа, дебет, кредит, маблағ.',
  'Ҳисобҳои синфи 1 ва 5 — актив; синфи 2, 3 ва 4 — пассив (мувофиқи НЯҲ).',
  'Маблағҳои ғайрибуҷетӣ аз волидон дар ҳисоби 4 42 300 (даромад аз муассисаҳои ғайрибозаргонӣ) ҷудогона қайд мешаванд.',
  'Ҳисоботҳо мувофиқи шаклҳои №1–№6 (Дастурамал №204) тартиб дода мешаванд.',
  ...BUDGET_MEMORIAL_ORDER_RULES,
] as const;

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

export type BudgetOperationCategory =
  | 'memorial'
  | 'payment'
  | 'cash'
  | 'invoice'
  | 'budget-notice'
  | 'bank';

export type BudgetOperationTemplate = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  documentTypeKey: string;
  category: BudgetOperationCategory;
  instructionRef?: string;
  buildLines: (amount: number) => BudgetAccountingJournalLine[];
};

/** Амалиётҳои молиявӣ бо ҳуҷҷатҳои асосии мувофиқ (ғайр аз мемориалӣ-фармон) */
export const BUDGET_CASH_PAYMENT_TEMPLATES: BudgetOperationTemplate[] = [
  {
    id: 'budget-receipt',
    labelKey: 'nyahOpBudgetReceipt',
    descriptionKey: 'nyahOpBudgetReceiptDesc',
    documentTypeKey: 'nyahDocBudgetNotice',
    category: 'budget-notice',
    instructionRef: 'Дастурамал №204, ҳ. 236–240',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BUDGET_DEFERRED_REVENUE_LOCAL, debit: 0, credit: amount },
    ],
  },
  {
    id: 'treasury-financing',
    labelKey: 'nyahOpTreasuryFinancing',
    descriptionKey: 'nyahOpTreasuryFinancingDesc',
    documentTypeKey: 'nyahDocBudgetNotice',
    category: 'budget-notice',
    instructionRef: 'Дастурамал №204, ҳ. 249–254',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_TREASURY_INTERNAL_LIABILITY, debit: 0, credit: amount },
    ],
  },
  {
    id: 'parent-membership-receipt',
    labelKey: 'nyahOpParentMembershipReceipt',
    descriptionKey: 'nyahOpParentMembershipReceiptDesc',
    documentTypeKey: 'nyahDocBankStatement',
    category: 'bank',
    instructionRef: 'Фармоиш №173, ҳ. 8177–8189',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_PARENT_MEMBERSHIP_REVENUE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'parent-food-receipt',
    labelKey: 'nyahOpParentFoodReceipt',
    descriptionKey: 'nyahOpParentFoodReceiptDesc',
    documentTypeKey: 'nyahDocBankStatement',
    category: 'bank',
    instructionRef: 'Фармоиш №173, ҳ. 8177–8189',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_PARENT_FOOD_REVENUE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'food-purchase',
    labelKey: 'nyahOpFoodPurchase',
    descriptionKey: 'nyahOpFoodPurchaseDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    category: 'payment',
    instructionRef: 'Фармоиш №173, ҳ. 8247–8249',
    buildLines: (amount) => [
      { accountCode: NYAH_SUPPLIER_PAYABLE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'material-receipt',
    labelKey: 'nyahOpMaterialReceipt',
    descriptionKey: 'nyahOpMaterialReceiptDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    category: 'payment',
    instructionRef: 'Фармоиш №173, ҳ. 8247–8249',
    buildLines: (amount) => [
      { accountCode: NYAH_SUPPLIER_PAYABLE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'payroll-payment',
    labelKey: 'nyahOpPayrollPayment',
    descriptionKey: 'nyahOpPayrollPaymentDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    category: 'payment',
    instructionRef: 'Фармоиш №173, ҳ. 9654–9655',
    buildLines: (amount) => [
      { accountCode: NYAH_PAYROLL_PAYABLE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'grant-receipt',
    labelKey: 'nyahOpGrantReceipt',
    descriptionKey: 'nyahOpGrantReceiptDesc',
    documentTypeKey: 'nyahDocBudgetNotice',
    category: 'budget-notice',
    instructionRef: 'Фармоиш №173, ҳ. 8236–8237',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_GRANT_REVENUE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'tax-payment',
    labelKey: 'nyahOpTaxPayment',
    descriptionKey: 'nyahOpTaxPaymentDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    category: 'payment',
    instructionRef: 'Дастурамал №204, ҳ. 272–274',
    buildLines: (amount) => [
      { accountCode: '2 11 690', debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'cash-to-bank',
    labelKey: 'nyahOpCashToBank',
    descriptionKey: 'nyahOpCashToBankDesc',
    documentTypeKey: 'nyahDocCashOrder',
    category: 'cash',
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
    category: 'cash',
    buildLines: (amount) => [
      { accountCode: NYAH_CASH_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'fixed-asset-purchase',
    labelKey: 'nyahOpFixedAssetPurchase',
    descriptionKey: 'nyahOpFixedAssetPurchaseDesc',
    documentTypeKey: 'nyahDocPaymentOrder',
    category: 'payment',
    instructionRef: 'Фармоиш №173, ҳ. 8247–8249',
    buildLines: (amount) => [
      { accountCode: NYAH_SUPPLIER_PAYABLE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_BANK_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'product-sale',
    labelKey: 'nyahOpProductSale',
    descriptionKey: 'nyahOpProductSaleDesc',
    documentTypeKey: 'nyahDocBankStatement',
    category: 'bank',
    instructionRef: 'Фармоиш №173, ҳ. 9739–9740',
    buildLines: (amount) => [
      { accountCode: NYAH_BANK_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_PRODUCT_SALE_REVENUE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
];

export const BUDGET_OPERATION_TEMPLATES: BudgetOperationTemplate[] = [
  ...BUDGET_MEMORIAL_ORDER_TEMPLATES,
  ...BUDGET_CASH_PAYMENT_TEMPLATES,
];

export const BUDGET_OPERATION_CATEGORIES: {
  id: BudgetOperationCategory;
  labelKey: string;
}[] = [
  { id: 'memorial', labelKey: 'nyahCategoryMemorial' },
  { id: 'payment', labelKey: 'nyahCategoryPayment' },
  { id: 'cash', labelKey: 'nyahCategoryCash' },
  { id: 'bank', labelKey: 'nyahCategoryBank' },
  { id: 'budget-notice', labelKey: 'nyahCategoryBudgetNotice' },
];

export function templatesByCategory(
  category: BudgetOperationCategory
): BudgetOperationTemplate[] {
  return BUDGET_OPERATION_TEMPLATES.filter((item) => item.category === category);
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
    if (!isValidNyahAccountCode(line.accountCode)) return 'nyahErrorUnknownAccount';
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
  const legacyIds: Record<string, string> = {
    'payroll-accrual': 'mo-payroll-accrual',
    'food-consumption': 'mo-food-consumption',
    depreciation: 'mo-depreciation',
  };
  const resolvedId = legacyIds[id] ?? id;
  return BUDGET_OPERATION_TEMPLATES.find((item) => item.id === resolvedId);
}
