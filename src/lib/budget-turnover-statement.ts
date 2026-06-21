import templateRows from '@/data/turnover-statement-template.json';
import { normalizeAccountCode, resolveNyahAccountName, findNyahAccount } from '@/lib/budget-unified-chart-of-accounts';
import { formatAmount } from '@/lib/staff-table-calc';
import {
  BudgetAccountingJournalEntry,
  BudgetAccountingSettings,
  OrganizationSectionContent,
} from '@/types/organization-section';

export type TurnoverStatementRowKind = 'header' | 'account';

export type TurnoverStatementTemplateRow = {
  kind: TurnoverStatementRowKind;
  label: string;
  accountCode?: string;
};

export type TurnoverStatementRow = {
  kind: TurnoverStatementRowKind;
  label: string;
  accountCode?: string;
  openingDebit: number;
  openingCredit: number;
  debitTurnover: number;
  creditTurnover: number;
  closingDebit: number;
  closingCredit: number;
};

export type TurnoverStatementDocument = {
  periodFrom: string;
  periodTo: string;
  rows: TurnoverStatementRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    debitTurnover: number;
    creditTurnover: number;
    closingDebit: number;
    closingCredit: number;
  };
};

const SKIP_TEMPLATE_HEADERS = new Set(['ВЕДОМОСТИ   ГАРДИШИ - САЛДО', 'ҲИСОБ']);

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeSide(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return 0;
  return roundMoney(value);
}

function splitBalance(debit: number, credit: number): { debit: number; credit: number } {
  const net = roundMoney(debit - credit);
  if (net >= 0) return { debit: net, credit: 0 };
  return { debit: 0, credit: roundMoney(-net) };
}

export function formatTurnoverStatementAmount(value: number): string {
  if (!value) return '0,00';
  return formatAmount(value);
}

export function defaultTurnoverPeriod(fiscalYear: string): { from: string; to: string } {
  const year = fiscalYear.trim() || String(new Date().getFullYear());
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const yearEnd = `${year}-12-31`;
  return {
    from: `${year}-01-01`,
    to: todayIso.startsWith(year) ? todayIso : yearEnd,
  };
}

export function resolveTurnoverPeriod(
  settings: BudgetAccountingSettings
): { from: string; to: string } {
  const defaults = defaultTurnoverPeriod(settings.fiscalYear);
  const from = settings.turnoverPeriodFrom?.trim() || defaults.from;
  const to = settings.turnoverPeriodTo?.trim() || defaults.to;
  if (from > to) return { from: to, to: from };
  return { from, to };
}

function turnoverTemplateRows(): TurnoverStatementTemplateRow[] {
  return (templateRows as TurnoverStatementTemplateRow[]).filter(
    (row) => !(row.kind === 'header' && SKIP_TEMPLATE_HEADERS.has(row.label.trim()))
  );
}

export function memorialJournalEntries(
  entries: BudgetAccountingJournalEntry[] | undefined
): BudgetAccountingJournalEntry[] {
  return (entries ?? []).filter((entry) => Boolean(entry.memorialOrderId?.trim()));
}

export function legacyJournalEntries(
  entries: BudgetAccountingJournalEntry[] | undefined
): BudgetAccountingJournalEntry[] {
  return (entries ?? []).filter((entry) => !entry.memorialOrderId?.trim());
}

function buildOpeningBalanceMap(
  settings: BudgetAccountingSettings
): Map<string, { debit: number; credit: number }> {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const [code, entry] of Object.entries(settings.openingBalances ?? {})) {
    const normalized = normalizeAccountCode(code);
    if (!normalized) continue;
    const current = map.get(normalized) ?? { debit: 0, credit: 0 };
    current.debit = roundMoney(current.debit + normalizeSide(entry?.debit));
    current.credit = roundMoney(current.credit + normalizeSide(entry?.credit));
    map.set(normalized, current);
  }
  return map;
}

function sumJournalByAccount(
  entries: BudgetAccountingJournalEntry[] | undefined,
  periodFrom: string,
  periodTo: string
): Map<string, { debit: number; credit: number }> {
  const map = new Map<string, { debit: number; credit: number }>();

  for (const entry of memorialJournalEntries(entries)) {
    if (entry.date < periodFrom || entry.date > periodTo) continue;
    for (const line of entry.lines) {
      const code = normalizeAccountCode(line.accountCode);
      if (!code) continue;
      const current = map.get(code) ?? { debit: 0, credit: 0 };
      current.debit = roundMoney(current.debit + (line.debit || 0));
      current.credit = roundMoney(current.credit + (line.credit || 0));
      map.set(code, current);
    }
  }

  return map;
}

function openingForAccount(
  openingMap: Map<string, { debit: number; credit: number }>,
  accountCode: string
): { debit: number; credit: number } {
  return openingMap.get(accountCode) ?? { debit: 0, credit: 0 };
}

function accountRowHasActivity(row: TurnoverStatementRow): boolean {
  return (
    row.openingDebit > 0 ||
    row.openingCredit > 0 ||
    row.debitTurnover > 0 ||
    row.creditTurnover > 0
  );
}

function filterRowsWithActivity(rows: TurnoverStatementRow[]): TurnoverStatementRow[] {
  const filtered: TurnoverStatementRow[] = [];
  let pendingHeader: TurnoverStatementRow | null = null;
  let sectionHasActive = false;

  const flushHeader = () => {
    if (pendingHeader && sectionHasActive) {
      filtered.push(pendingHeader);
    }
    pendingHeader = null;
    sectionHasActive = false;
  };

  for (const row of rows) {
    if (row.kind === 'header') {
      flushHeader();
      pendingHeader = row;
      continue;
    }
    if (!accountRowHasActivity(row)) continue;
    sectionHasActive = true;
    filtered.push(row);
  }

  flushHeader();
  return filtered;
}

function buildAccountRow(
  label: string,
  accountCode: string,
  openingMap: Map<string, { debit: number; credit: number }>,
  turnoverMap: Map<string, { debit: number; credit: number }>
): TurnoverStatementRow {
  const opening = openingForAccount(openingMap, accountCode);
  const turnover = turnoverMap.get(accountCode) ?? { debit: 0, credit: 0 };
  const closing = splitBalance(
    opening.debit + turnover.debit,
    opening.credit + turnover.credit
  );

  const account = findNyahAccount(accountCode);
  const resolvedLabel = account ? resolveNyahAccountName(account) : label;

  return {
    kind: 'account',
    label: resolvedLabel || label,
    accountCode,
    openingDebit: opening.debit,
    openingCredit: opening.credit,
    debitTurnover: turnover.debit,
    creditTurnover: turnover.credit,
    closingDebit: closing.debit,
    closingCredit: closing.credit,
  };
}

export function buildTurnoverStatement(
  financeContent: OrganizationSectionContent,
  settings: BudgetAccountingSettings,
  period?: { from: string; to: string }
): TurnoverStatementDocument {
  const { from: periodFrom, to: periodTo } = period ?? resolveTurnoverPeriod(settings);
  const openingMap = buildOpeningBalanceMap(settings);
  const turnoverMap = sumJournalByAccount(
    financeContent.budgetAccountingJournal,
    periodFrom,
    periodTo
  );

  const templateCodes = new Set<string>();
  const rows: TurnoverStatementRow[] = [];

  for (const templateRow of turnoverTemplateRows()) {
    if (templateRow.kind === 'header') {
      rows.push({
        kind: 'header',
        label: templateRow.label.trim(),
        openingDebit: 0,
        openingCredit: 0,
        debitTurnover: 0,
        creditTurnover: 0,
        closingDebit: 0,
        closingCredit: 0,
      });
      continue;
    }

    const accountCode = normalizeAccountCode(templateRow.accountCode ?? '');
    if (!accountCode) continue;
    templateCodes.add(accountCode);
    rows.push(buildAccountRow(templateRow.label, accountCode, openingMap, turnoverMap));
  }

  const extraCodes = new Set<string>();
  for (const code of openingMap.keys()) {
    if (!templateCodes.has(code)) extraCodes.add(code);
  }
  for (const code of turnoverMap.keys()) {
    if (!templateCodes.has(code)) extraCodes.add(code);
  }

  if (extraCodes.size > 0) {
    rows.push({
      kind: 'header',
      label: 'ДИГАР ҲИСОБҲО',
      openingDebit: 0,
      openingCredit: 0,
      debitTurnover: 0,
      creditTurnover: 0,
      closingDebit: 0,
      closingCredit: 0,
    });
    for (const accountCode of [...extraCodes].sort()) {
      rows.push(buildAccountRow(accountCode, accountCode, openingMap, turnoverMap));
    }
  }

  const visibleRows = filterRowsWithActivity(rows);
  const dataRows = visibleRows.filter((row) => row.kind === 'account');
  const totals = {
    openingDebit: roundMoney(dataRows.reduce((sum, row) => sum + row.openingDebit, 0)),
    openingCredit: roundMoney(dataRows.reduce((sum, row) => sum + row.openingCredit, 0)),
    debitTurnover: roundMoney(dataRows.reduce((sum, row) => sum + row.debitTurnover, 0)),
    creditTurnover: roundMoney(dataRows.reduce((sum, row) => sum + row.creditTurnover, 0)),
    closingDebit: roundMoney(dataRows.reduce((sum, row) => sum + row.closingDebit, 0)),
    closingCredit: roundMoney(dataRows.reduce((sum, row) => sum + row.closingCredit, 0)),
  };

  return {
    periodFrom,
    periodTo,
    rows: visibleRows,
    totals,
  };
}

export function formatTurnoverPeriodLabel(dateIso: string): string {
  const [year, month, day] = dateIso.split('-');
  if (!year || !month || !day) return dateIso;
  return `${day}.${month}. с. ${year}`;
}
