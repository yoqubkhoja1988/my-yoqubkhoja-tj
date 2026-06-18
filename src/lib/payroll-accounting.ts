/**
 * Ҳисобкунии музди меҳнат ва гузарониши мемориалӣ-фармонҳо (НЯҲ, Фармоиш №173).
 */

import {
  NYAH_EMPLOYER_SOCIAL_TAX_PAYABLE_ACCOUNT,
  NYAH_HHDT_PAYABLE_ACCOUNT,
  NYAH_INCOME_TAX_PAYABLE_ACCOUNT,
  NYAH_OTHER_DEDUCTIONS_PAYABLE_ACCOUNT,
  NYAH_PAYROLL_EXPENSE_ACCOUNT,
  NYAH_PAYROLL_PAYABLE_ACCOUNT,
  NYAH_SANATORIUM_PAYABLE_ACCOUNT,
  NYAH_SOCIAL_INSURANCE_EXPENSE_ACCOUNT,
  NYAH_SOCIAL_TAX_PAYABLE_ACCOUNT,
  NYAH_UNION_FEE_PAYABLE_ACCOUNT,
} from '@/lib/budget-unified-chart-of-accounts';
import {
  calcEntryTotals,
  formatLedgerAmount,
  hasStoredPayrollLedger,
  parseLedgerAmount,
  removePayrollLedger,
  syncPayrollLedgersAfterTimesheetChange,
  upsertPayrollLedger,
  type PayrollLedgerBuildContext,
} from '@/lib/finance-payroll-ledger';
import { isBudgetFundedOrganization } from '@/lib/organization-scope';
import { resolveBudgetAccountingSettings } from '@/lib/budget-accounting-journal';
import {
  BudgetAccountingJournalEntry,
  BudgetAccountingJournalLine,
  BudgetAccountingSettings,
  OrganizationSectionContent,
  PayrollLedger,
} from '@/types/organization-section';

/** Андози иҷтимоӣ аз корманд (ФҲИА 1%) */
export const PAYROLL_FHEA_EMPLOYEE_RATE = 0.01;
/** Аъзоҳаққии иттифоқи касаба (КИК) */
export const PAYROLL_UNION_FEE_RATE = 0.01;
/** Ҳифзи ҳуқуқи дастрасии тиббӣ (ҲҲДТ) */
export const PAYROLL_HHDT_RATE = 0.01;
/** Андози иҷтимоӣ аз корфармо (ФҲИА 25%) */
export const PAYROLL_EMPLOYER_FHEA_RATE = 0.25;
/** Санаторияи истироҳатӣ — 1,5% аз маблағи ФҲИА 25% */
export const PAYROLL_SANATORIUM_RATE = 0.015;

export type PayrollLedgerSummary = {
  month: string;
  gross: number;
  fheaEmployee: number;
  unionFee: number;
  hhdt: number;
  otherDeductions: number;
  incomeTax: number;
  netPay: number;
  employerFhea25: number;
  sanatorium15: number;
};

export function roundPayrollMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calcEmployerFhea25(gross: number): number {
  return roundPayrollMoney(gross * PAYROLL_EMPLOYER_FHEA_RATE);
}

export function calcSanatoriumFromEmployerFhea(employerFhea25: number): number {
  return roundPayrollMoney(employerFhea25 * PAYROLL_SANATORIUM_RATE);
}

export function summarizePayrollLedger(ledger: PayrollLedger): PayrollLedgerSummary {
  let gross = 0;
  let fheaEmployee = 0;
  let unionFee = 0;
  let hhdt = 0;
  let otherDeductions = 0;
  let incomeTax = 0;
  let netPay = 0;

  for (const entry of ledger.entries) {
    const totals = calcEntryTotals(entry);
    gross += totals.gross;
    fheaEmployee += totals.fhea;
    unionFee += totals.kik;
    hhdt += totals.hhdt;
    otherDeductions += totals.otherDeductions;
    incomeTax += totals.tax;
    netPay += totals.netPay;
  }

  const employerFhea25 = calcEmployerFhea25(gross);
  const sanatorium15 = calcSanatoriumFromEmployerFhea(employerFhea25);

  return {
    month: ledger.month,
    gross: roundPayrollMoney(gross),
    fheaEmployee: roundPayrollMoney(fheaEmployee),
    unionFee: roundPayrollMoney(unionFee),
    hhdt: roundPayrollMoney(hhdt),
    otherDeductions: roundPayrollMoney(otherDeductions),
    incomeTax: roundPayrollMoney(incomeTax),
    netPay: roundPayrollMoney(netPay),
    employerFhea25,
    sanatorium15,
  };
}

type MemorialSpec = {
  id: string;
  description: string;
  debit: string;
  credit: string;
  amount: number;
};

function memorialLines(debit: string, credit: string, amount: number): BudgetAccountingJournalLine[] {
  const value = roundPayrollMoney(amount);
  return [
    { accountCode: debit, debit: value, credit: 0 },
    { accountCode: credit, debit: 0, credit: value },
  ];
}

function buildMemorialSpecs(summary: PayrollLedgerSummary): MemorialSpec[] {
  const monthLabel = summary.month;
  const specs: MemorialSpec[] = [];

  if (summary.gross > 0) {
    specs.push({
      id: 'payroll-mo-accrual',
      description: `Ба ҳисоб гирифтани музди меҳнат (${monthLabel})`,
      debit: NYAH_PAYROLL_EXPENSE_ACCOUNT,
      credit: NYAH_PAYROLL_PAYABLE_ACCOUNT,
      amount: summary.gross,
    });
  }

  if (summary.fheaEmployee > 0) {
    specs.push({
      id: 'payroll-mo-social-employee',
      description: `ФҲИА 1% аз корманд (${monthLabel})`,
      debit: NYAH_PAYROLL_PAYABLE_ACCOUNT,
      credit: NYAH_SOCIAL_TAX_PAYABLE_ACCOUNT,
      amount: summary.fheaEmployee,
    });
  }

  if (summary.incomeTax > 0) {
    specs.push({
      id: 'payroll-mo-income-tax',
      description: `Андоз аз даромад (${monthLabel})`,
      debit: NYAH_PAYROLL_PAYABLE_ACCOUNT,
      credit: NYAH_INCOME_TAX_PAYABLE_ACCOUNT,
      amount: summary.incomeTax,
    });
  }

  if (summary.unionFee > 0) {
    specs.push({
      id: 'payroll-mo-union',
      description: `Аъзоҳаққии иттифоқи касаба (${monthLabel})`,
      debit: NYAH_PAYROLL_PAYABLE_ACCOUNT,
      credit: NYAH_UNION_FEE_PAYABLE_ACCOUNT,
      amount: summary.unionFee,
    });
  }

  if (summary.hhdt > 0) {
    specs.push({
      id: 'payroll-mo-hhdt',
      description: `Ҳифзи ҳуқуқи дастрасии тиббӣ (${monthLabel})`,
      debit: NYAH_PAYROLL_PAYABLE_ACCOUNT,
      credit: NYAH_HHDT_PAYABLE_ACCOUNT,
      amount: summary.hhdt,
    });
  }

  if (summary.otherDeductions > 0) {
    specs.push({
      id: 'payroll-mo-other-deductions',
      description: `Дигар боздоштҳо (${monthLabel})`,
      debit: NYAH_PAYROLL_PAYABLE_ACCOUNT,
      credit: NYAH_OTHER_DEDUCTIONS_PAYABLE_ACCOUNT,
      amount: summary.otherDeductions,
    });
  }

  if (summary.employerFhea25 > 0) {
    specs.push({
      id: 'payroll-mo-employer-social',
      description: `ФҲИА 25% аз корфармо (${monthLabel})`,
      debit: NYAH_SOCIAL_INSURANCE_EXPENSE_ACCOUNT,
      credit: NYAH_EMPLOYER_SOCIAL_TAX_PAYABLE_ACCOUNT,
      amount: summary.employerFhea25,
    });
  }

  if (summary.sanatorium15 > 0) {
    specs.push({
      id: 'payroll-mo-sanatorium',
      description: `Санаторияи истироҳатӣ 1,5% аз ФҲИА (${monthLabel})`,
      debit: NYAH_EMPLOYER_SOCIAL_TAX_PAYABLE_ACCOUNT,
      credit: NYAH_SANATORIUM_PAYABLE_ACCOUNT,
      amount: summary.sanatorium15,
    });
  }

  return specs;
}

function newJournalEntryId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `mo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildPayrollMemorialJournalEntries(
  ledger: PayrollLedger,
  settings: BudgetAccountingSettings,
  existingEntries: BudgetAccountingJournalEntry[] | undefined,
  startEntryNumber: number
): BudgetAccountingJournalEntry[] {
  const summary = summarizePayrollLedger(ledger);
  const specs = buildMemorialSpecs(summary);
  if (specs.length === 0) return [];

  const [year, mon] = ledger.month.split('-');
  const lastDay = new Date(Number(year), Number(mon), 0).getDate();
  const entryDate = `${ledger.month}-${String(lastDay).padStart(2, '0')}`;
  const documentNumber = ledger.month;
  const preparedAt = ledger.preparedAt ?? entryDate;

  return specs.map((spec, index) => ({
    id: newJournalEntryId(),
    entryNumber: startEntryNumber + index,
    date: preparedAt.slice(0, 10) || entryDate,
    description: spec.description,
    operationTemplateId: spec.id,
    documentType: 'Мемориалӣ-фармон',
    documentNumber,
    sourcePayrollMonth: ledger.month,
    lines: memorialLines(spec.debit, spec.credit, spec.amount),
    createdAt: new Date().toISOString(),
  }));
}

export function removePayrollMemorialJournalEntries(
  entries: BudgetAccountingJournalEntry[] | undefined,
  month: string
): BudgetAccountingJournalEntry[] {
  return (entries ?? []).filter((entry) => entry.sourcePayrollMonth !== month);
}

export function syncPayrollMemorialJournal(
  ledger: PayrollLedger,
  settings: BudgetAccountingSettings,
  journal: BudgetAccountingJournalEntry[] | undefined
): {
  entries: BudgetAccountingJournalEntry[];
  settings: BudgetAccountingSettings;
} {
  const withoutMonth = removePayrollMemorialJournalEntries(journal, ledger.month);
  const maxExisting = withoutMonth.reduce((max, entry) => Math.max(max, entry.entryNumber), 0);
  const startNumber = Math.max(settings.nextEntryNumber ?? 1, maxExisting + 1);
  const newEntries = buildPayrollMemorialJournalEntries(
    ledger,
    settings,
    withoutMonth,
    startNumber
  );

  const merged = [...withoutMonth, ...newEntries].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.entryNumber - b.entryNumber;
  });

  return {
    entries: merged,
    settings: {
      ...settings,
      nextEntryNumber: startNumber + newEntries.length,
    },
  };
}

export function formatPayrollSummaryAmount(value: number): string {
  return formatLedgerAmount(value);
}

export function parsePayrollSummaryAmount(value: string): number {
  return parseLedgerAmount(value);
}

/** Бозсозии ҳамаи гузаронишҳои мемориалӣ аз китобҳои сабтшудаи музди меҳнат */
export function rebuildPayrollMemorialJournalInFinance(
  financeContent: OrganizationSectionContent
): OrganizationSectionContent {
  const ledgers = (financeContent.payrollLedgers ?? []).filter((ledger) =>
    hasStoredPayrollLedger(financeContent.payrollLedgers, ledger.month)
  );
  const manualEntries = (financeContent.budgetAccountingJournal ?? []).filter(
    (entry) => !entry.sourcePayrollMonth
  );

  let settings = resolveBudgetAccountingSettings(financeContent);
  let journal = manualEntries;

  for (const ledger of [...ledgers].sort((a, b) => a.month.localeCompare(b.month))) {
    if (!ledger.preparedAt) continue;
    const synced = syncPayrollMemorialJournal(ledger, settings, journal);
    journal = synced.entries;
    settings = synced.settings;
  }

  return {
    ...financeContent,
    budgetAccountingJournal: journal,
    budgetAccountingSettings: settings,
  };
}

export type PayrollAccountingPostResult = {
  entries: BudgetAccountingJournalEntry[];
  settings: BudgetAccountingSettings;
  postedCount: number;
  errors: string[];
};

/**
 * Гузарониши амалиётҳои мемориалӣ аз китоби музди меҳнат ба ҷадвали НЯҲ.
 * Сабтҳои қаблӣ барои ҳамон моҳ иваз карда мешаванд.
 */
export function postPayrollAccountingOperations(
  ledger: PayrollLedger,
  financeContent: OrganizationSectionContent
): PayrollAccountingPostResult {
  if (!ledger.preparedAt) {
    return {
      entries: financeContent.budgetAccountingJournal ?? [],
      settings: resolveBudgetAccountingSettings(financeContent),
      postedCount: 0,
      errors: [],
    };
  }

  const settings = resolveBudgetAccountingSettings(financeContent);
  const synced = syncPayrollMemorialJournal(
    ledger,
    settings,
    financeContent.budgetAccountingJournal
  );
  const postedCount = synced.entries.filter(
    (entry) => entry.sourcePayrollMonth === ledger.month
  ).length;

  return {
    entries: synced.entries,
    settings: synced.settings,
    postedCount,
    errors: [],
  };
}

export type PayrollLedgerPersistResult = {
  content: OrganizationSectionContent;
  postedCount: number;
  postingErrors: string[];
};

/** Сабти китоби музди меҳнат ва гузарониши худкори амалиётҳои муҳосибӣ */
export function persistPayrollLedgerInFinance(
  financeContent: OrganizationSectionContent,
  ledger: PayrollLedger,
  organizationId?: string
): PayrollLedgerPersistResult {
  const withLedger: OrganizationSectionContent = {
    ...financeContent,
    payrollLedgers: upsertPayrollLedger(financeContent.payrollLedgers, ledger),
  };

  if (!organizationId || !isBudgetFundedOrganization(organizationId) || !ledger.preparedAt) {
    return {
      content: withLedger,
      postedCount: 0,
      postingErrors: [],
    };
  }

  const posted = postPayrollAccountingOperations(ledger, withLedger);
  return {
    content: {
      ...withLedger,
      budgetAccountingJournal: posted.entries,
      budgetAccountingSettings: posted.settings,
    },
    postedCount: posted.postedCount,
    postingErrors: posted.errors,
  };
}

/** Нест кардани китоб ва гузаронишҳои мемориалии ҳамон моҳ */
export function removePayrollLedgerInFinance(
  financeContent: OrganizationSectionContent,
  month: string,
  organizationId?: string
): OrganizationSectionContent {
  const withoutLedger: OrganizationSectionContent = {
    ...financeContent,
    payrollLedgers: removePayrollLedger(financeContent.payrollLedgers, month),
  };

  if (!organizationId || !isBudgetFundedOrganization(organizationId)) {
    return withoutLedger;
  }

  return syncFinanceAfterPayrollLedgerDelete(withoutLedger, month);
}

/** Навсозии китоб пас аз тағйири табел ва гузарониши дубораи амалиётҳо */
export function applyPayrollLedgerTimesheetSync(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  months: string[],
  context: PayrollLedgerBuildContext = {}
): OrganizationSectionContent {
  const ledgers = syncPayrollLedgersAfterTimesheetChange(
    financeContent.payrollLedgers,
    staffContent,
    months,
    context
  );

  let next: OrganizationSectionContent = {
    ...financeContent,
    payrollLedgers: ledgers,
  };

  const organizationId = context.organizationId;
  if (!organizationId || !isBudgetFundedOrganization(organizationId)) {
    return next;
  }

  for (const month of months) {
    const ledger = ledgers.find((item) => item.month === month);
    if (!ledger?.preparedAt) continue;
    const posted = postPayrollAccountingOperations(ledger, next);
    next = {
      ...next,
      budgetAccountingJournal: posted.entries,
      budgetAccountingSettings: posted.settings,
    };
  }

  return next;
}

export function syncFinanceAfterPayrollLedgerSave(
  financeContent: OrganizationSectionContent,
  ledger: PayrollLedger
): OrganizationSectionContent {
  if (!ledger.preparedAt) return financeContent;

  const posted = postPayrollAccountingOperations(ledger, financeContent);
  return {
    ...financeContent,
    budgetAccountingJournal: posted.entries,
    budgetAccountingSettings: posted.settings,
  };
}

export function syncFinanceAfterPayrollLedgerDelete(
  financeContent: OrganizationSectionContent,
  month: string
): OrganizationSectionContent {
  return {
    ...financeContent,
    budgetAccountingJournal: removePayrollMemorialJournalEntries(
      financeContent.budgetAccountingJournal,
      month
    ),
  };
}
