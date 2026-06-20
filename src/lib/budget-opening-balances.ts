import {
  findNyahAccount,
  isValidNyahAccountCode,
  normalizeAccountCode,
  resolveNyahAccountName,
} from '@/lib/budget-unified-chart-of-accounts';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  BudgetAccountingOpeningBalance,
  BudgetAccountingSettings,
} from '@/types/organization-section';

export type NyahOpeningBalanceRow = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type NyahOpeningBalanceSummary = {
  totalDebit: number;
  totalCredit: number;
  difference: number;
  balanced: boolean;
  rowCount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeSide(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return 0;
  return roundMoney(value);
}

export function formatOpeningBalanceAmount(value: number): string {
  return formatAmount(value);
}

export function parseOpeningBalanceAmount(value: string): number {
  return normalizeSide(parseAmount(value) ?? 0);
}

export function openingBalanceRows(
  settings: BudgetAccountingSettings
): NyahOpeningBalanceRow[] {
  const map = settings.openingBalances ?? {};
  return Object.entries(map)
    .map(([accountCode, entry]) => {
      const normalized = normalizeAccountCode(accountCode);
      const account = findNyahAccount(normalized);
      return {
        accountCode: normalized,
        accountName: account ? resolveNyahAccountName(account) : normalized,
        debit: normalizeSide(entry.debit),
        credit: normalizeSide(entry.credit),
      };
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export function addOpeningBalanceAccount(
  map: Record<string, BudgetAccountingOpeningBalance>,
  accountCode: string
): Record<string, BudgetAccountingOpeningBalance> {
  const normalized = normalizeAccountCode(accountCode);
  if (!normalized || !isValidNyahAccountCode(normalized) || map[normalized]) {
    return map;
  }
  return { ...map, [normalized]: {} };
}

export function filledOpeningBalanceRows(
  settings: BudgetAccountingSettings
): NyahOpeningBalanceRow[] {
  return openingBalanceRows(settings).filter((row) => row.debit > 0 || row.credit > 0);
}

export function cleanOpeningBalances(
  settings: BudgetAccountingSettings
): BudgetAccountingSettings {
  const map = settings.openingBalances ?? {};
  const next: Record<string, BudgetAccountingOpeningBalance> = {};
  for (const [code, entry] of Object.entries(map)) {
    const normalized = normalizeAccountCode(code);
    const debit = normalizeSide(entry.debit);
    const credit = normalizeSide(entry.credit);
    if (debit <= 0 && credit <= 0) continue;
    next[normalized] = {
      ...(debit > 0 ? { debit } : {}),
      ...(credit > 0 ? { credit } : {}),
    };
  }
  return { ...settings, openingBalances: next };
}

export function summarizeOpeningBalances(
  rows: NyahOpeningBalanceRow[]
): NyahOpeningBalanceSummary {
  const totalDebit = roundMoney(rows.reduce((sum, row) => sum + row.debit, 0));
  const totalCredit = roundMoney(rows.reduce((sum, row) => sum + row.credit, 0));
  const difference = roundMoney(Math.abs(totalDebit - totalCredit));
  return {
    totalDebit,
    totalCredit,
    difference,
    balanced: difference < 0.01,
    rowCount: rows.length,
  };
}

export function setOpeningBalanceAmounts(
  map: Record<string, BudgetAccountingOpeningBalance>,
  accountCode: string,
  debit: number,
  credit: number,
  options?: { keepEmptyAccount?: boolean }
): Record<string, BudgetAccountingOpeningBalance> {
  const normalized = normalizeAccountCode(accountCode);
  if (!normalized || !isValidNyahAccountCode(normalized)) return map;

  const nextDebit = normalizeSide(debit);
  const nextCredit = normalizeSide(credit);

  if (nextDebit <= 0 && nextCredit <= 0) {
    if (options?.keepEmptyAccount && normalized in map) {
      return { ...map, [normalized]: {} };
    }
    const next = { ...map };
    delete next[normalized];
    return next;
  }

  return {
    ...map,
    [normalized]: {
      ...(nextDebit > 0 ? { debit: nextDebit } : {}),
      ...(nextCredit > 0 ? { credit: nextCredit } : {}),
    },
  };
}

export function upsertOpeningBalance(
  map: Record<string, BudgetAccountingOpeningBalance>,
  accountCode: string,
  patch: BudgetAccountingOpeningBalance
): Record<string, BudgetAccountingOpeningBalance> {
  const normalized = normalizeAccountCode(accountCode);
  const existing = normalized ? map[normalized] : undefined;
  return setOpeningBalanceAmounts(
    map,
    accountCode,
    patch.debit ?? existing?.debit ?? 0,
    patch.credit ?? existing?.credit ?? 0,
    { keepEmptyAccount: true }
  );
}

export function removeOpeningBalance(
  map: Record<string, BudgetAccountingOpeningBalance>,
  accountCode: string
): Record<string, BudgetAccountingOpeningBalance> {
  const normalized = normalizeAccountCode(accountCode);
  const next = { ...map };
  delete next[normalized];
  return next;
}
