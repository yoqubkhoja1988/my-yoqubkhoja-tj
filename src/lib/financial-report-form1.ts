import { computeAccountTurnover } from '@/lib/budget-accounting-journal';
import {
  findNyahAccount,
  normalizeAccountCode,
} from '@/lib/budget-unified-chart-of-accounts';
import { formatAmount } from '@/lib/staff-table-calc';
import { FINANCIAL_REPORT_INSTRUCTION } from '@/lib/financial-reports-catalog';
import {
  BudgetAccountingJournalEntry,
  BalanceSheetReportSettings,
  OrganizationSectionContent,
} from '@/types/organization-section';

export const FORM1_TABLE_TITLE = 'Шакли №1 — Ҳисобот оид ба волияти молиявӣ';

export type Form1RowKind = 'header' | 'data' | 'subtotal' | 'total';

export type Form1Side = 'asset' | 'liability' | 'equity';

export type Form1RowDefinition = {
  id: string;
  name: string;
  kind: Form1RowKind;
  rowCode?: string;
  side?: Form1Side;
  accountFormula?: string;
  sumRowCodes?: string[];
};

export type Form1ComputedRow = {
  id: string;
  name: string;
  kind: Form1RowKind;
  rowCode?: string;
  opening: number;
  closing: number;
  openingFormatted: string;
  closingFormatted: string;
  indent: number;
};

export type BalanceSheetReportDocument = {
  fiscalYear: string;
  periodEndLabel: string;
  organizationName: string;
  rma?: string;
  instructionRef: string;
  rows: Form1ComputedRow[];
  totals: {
    assetsOpening: number;
    assetsClosing: number;
    liabilitiesOpening: number;
    liabilitiesClosing: number;
    equityOpening: number;
    equityClosing: number;
    balancedOpening: boolean;
    balancedClosing: boolean;
  };
  trialBalance: Array<{
    accountCode: string;
    accountName: string;
    openingDebit: number;
    openingCredit: number;
    debitTurnover: number;
    creditTurnover: number;
    closingDebit: number;
    closingCredit: number;
  }>;
};

/** Сатрҳои шакли №1 — Дастурамал №204, ҳ. 440–521 */
export const FORM1_ROW_DEFINITIONS: Form1RowDefinition[] = [
  { id: 'h-assets', name: 'Дороиҳо', kind: 'header' },
  { id: 'h-st-assets', name: 'Дороиҳои кӯтоҳмуддат', kind: 'header' },
  {
    id: 'r1',
    rowCode: '1',
    name: 'Воситаҳои пулӣ ва муодили онҳо',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.11.*+1.21.*',
  },
  {
    id: 'r2',
    rowCode: '2',
    name: 'Қарздории дебиторӣ',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.13.1*+1.14.*-1.16.*+1.23.*+1.24.*-1.26.*',
  },
  {
    id: 'r3',
    rowCode: '3',
    name: 'Захираҳо',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.31.*',
  },
  {
    id: 'r4',
    rowCode: '4',
    name: 'Пешпардохтҳои додашуда',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.15.*+1.25.*',
  },
  {
    id: 'r5',
    rowCode: '5',
    name: 'Дигар дороиҳои кӯтоҳмуддат',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.12.*+1.22.*',
  },
  {
    id: 's-st-assets',
    name: 'Ҷамъи дороиҳои кӯтоҳмуддат',
    kind: 'subtotal',
    sumRowCodes: ['1', '2', '3', '4', '5'],
  },
  { id: 'h-lt-assets', name: 'Дороиҳои дарозмуддат', kind: 'header' },
  {
    id: 'r6',
    rowCode: '6',
    name: 'Қарздории дебиторӣ',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.63.*-1.64.*+1.71.1*+1.71.2*+1.73.*-1.74.*',
  },
  {
    id: 'r7',
    rowCode: '7',
    name: 'Сармоя дар ташкилоти асосиатсияшуда',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.71.32*+1.71.33*',
  },
  {
    id: 'r8',
    rowCode: '8',
    name: 'Дигар дороиҳои молиявӣ',
    kind: 'data',
    side: 'asset',
    accountFormula:
      '1.61.*+1.62.*+1.71.31*+1.71.39*+1.71.4*+1.71.5*+1.71.6*+1.72.*+1.80.*',
  },
  {
    id: 'r9',
    rowCode: '9',
    name: 'Инфрасохтор, воситаҳои асосӣ',
    kind: 'data',
    side: 'asset',
    accountFormula:
      '1.41.2*+1.41.3*+1.41.4*-1.42.2*-1.42.3*-1.42.4*-1.42.5*+1.43.2*+1.43.3*+1.43.4*+1.46.2*+1.46.3*-1.55.120-1.55.13*-1.55.140-1.55.320-1.55.33*-1.55.340+1.44.2*-1.45.2*+1.47.*-1.48.*-1.55.4*',
  },
  {
    id: 'r10',
    rowCode: '10',
    name: 'Замин ва бино',
    kind: 'data',
    side: 'asset',
    accountFormula:
      '1.41.1*+1.41.5*-1.42.1*-1.42.5*+1.43.1*+1.46.1*+1.51.100+1.51.200-1.52.100-1.52.200-1.55.11*-1.55.150-1.55.31*-1.55.340-1.55.610-1.55.620-1.55.630+1.44.1*-1.45.1*+1.44.300-1.55.2*',
  },
  {
    id: 'r11',
    rowCode: '11',
    name: 'Дороиҳои ғайримоддӣ',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.49.*+1.51.4*-1.50.000-1.55.5*-1.55.64*-1.55.690',
  },
  {
    id: 'r12',
    rowCode: '12',
    name: 'Дигар дороиҳои ғайримолиявӣ',
    kind: 'data',
    side: 'asset',
    accountFormula: '1.51.3*+1.51.5*+1.54.*',
  },
  {
    id: 's-lt-assets',
    name: 'Ҷамъи дороиҳои дарозмуддат',
    kind: 'subtotal',
    sumRowCodes: ['6', '7', '8', '9', '10', '11', '12'],
  },
  {
    id: 't-assets',
    name: 'Ҳамагӣ дороиҳо',
    kind: 'total',
    sumRowCodes: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  },
  { id: 'h-liab', name: 'Ӯҳдадориҳо', kind: 'header' },
  { id: 'h-st-liab', name: 'Ӯҳдадориҳои кутоҳмуддат', kind: 'header' },
  {
    id: 'r13',
    rowCode: '13',
    name: 'Қарздории кредиторӣ',
    kind: 'data',
    side: 'liability',
    accountFormula:
      '2.11.1*+2.11.5*+2.11.6*+2.11.9*+2.12.1*+2.12.5*+2.12.9*+2.13.9*+2.23.*+2.24.*',
  },
  {
    id: 'r14',
    rowCode: '14',
    name: 'Қарзгирии кӯтоҳмуддат',
    kind: 'data',
    side: 'liability',
    accountFormula: '2.11.2*+2.11.3*+2.11.4*',
  },
  {
    id: 'r15',
    rowCode: '15',
    name: 'Қисми ҷории ӯҳдадориҳои қарзии дарозмуддат',
    kind: 'data',
    side: 'liability',
    accountFormula: '2.11.920+2.12.240+2.12.920',
  },
  {
    id: 'r16',
    rowCode: '16',
    name: 'Захираҳои кӯтоҳмуддат',
    kind: 'data',
    side: 'liability',
    accountFormula: '2.11.7*',
  },
  {
    id: 'r17',
    rowCode: '17',
    name: 'Подоши кормандон',
    kind: 'data',
    side: 'liability',
    accountFormula: '2.11.510',
  },
  {
    id: 'r18',
    rowCode: '18',
    name: 'Нафақа аз рӯи соли хизмат',
    kind: 'data',
    side: 'liability',
  },
  {
    id: 's-st-liab',
    name: 'Ҷамъи ӯҳдадориҳои кутоҳмуддат',
    kind: 'subtotal',
    sumRowCodes: ['13', '14', '15', '16', '17', '18'],
  },
  { id: 'h-lt-liab', name: 'Ӯҳдадориҳои дарозмуддат', kind: 'header' },
  {
    id: 'r19',
    rowCode: '19',
    name: 'Қарздории кредиторӣ',
    kind: 'data',
    side: 'liability',
    accountFormula: '2.21.400+2.21.8*+2.21.9*+2.22.8*+2.22.9*',
  },
  {
    id: 'r20',
    rowCode: '20',
    name: 'Қарзгирии дарозмуддат',
    kind: 'data',
    side: 'liability',
    accountFormula:
      '2.21.1*+2.21.2*+2.21.3*+2.21.6*+2.21.7*+2.22.100+2.22.2*+2.22.3*+2.22.4*+2.22.5*+2.22.6*+2.22.7*',
  },
  {
    id: 'r21',
    rowCode: '21',
    name: 'Захираҳои дарозмуддат',
    kind: 'data',
    side: 'liability',
    accountFormula: '2.21.500',
  },
  { id: 'r22', rowCode: '22', name: 'Подоши кормандон', kind: 'data', side: 'liability' },
  { id: 'r23', rowCode: '23', name: 'Нафақа аз рӯи соли хизмат', kind: 'data', side: 'liability' },
  {
    id: 's-lt-liab',
    name: 'Ҷамъи ӯҳдадориҳои дарозмуддат',
    kind: 'subtotal',
    sumRowCodes: ['19', '20', '21', '22', '23'],
  },
  {
    id: 't-liab',
    name: 'Ҳамагӣ ӯҳдадориҳо',
    kind: 'total',
    sumRowCodes: ['13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
  },
  { id: 'h-equity', name: 'Дороиҳои соф/сармоя', kind: 'header' },
  {
    id: 'r24',
    rowCode: '24',
    name: 'Сармояи аз ҷониби дигар субъектҳои бахши ҷамъиятии гузошташуда',
    kind: 'data',
    side: 'equity',
    accountFormula: '3.10.1*+3.10.2*+3.10.3*',
  },
  {
    id: 'r25',
    rowCode: '25',
    name: 'Захираҳо',
    kind: 'data',
    side: 'equity',
    accountFormula: '3.2*+3.3*+3.4*+3.5*',
  },
  {
    id: 'r26',
    rowCode: '26',
    name: 'Фоидаҳо/зарарҳои ҷамъшуда',
    kind: 'data',
    side: 'equity',
    accountFormula: '3.6*',
  },
  {
    id: 'r27',
    rowCode: '27',
    name: 'Ҳиссаи ақаллият',
    kind: 'data',
    side: 'equity',
    accountFormula: '3.70.*',
  },
  {
    id: 't-equity',
    name: 'Ҳамагӣ дороиҳои соф/сармоя',
    kind: 'total',
    sumRowCodes: ['24', '25', '26', '27'],
  },
  {
    id: 't-liab-equity',
    name: 'Ҳамагӣ ӯҳдадориҳо ва дороиҳои соф',
    kind: 'total',
    sumRowCodes: ['13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27'],
  },
];

export function canonicalAccountKey(code: string): string {
  return normalizeAccountCode(code).replace(/\s+/g, '.').replace(/\.+/g, '.');
}

export function matchesNyahPattern(pattern: string, accountCode: string): boolean {
  const key = canonicalAccountKey(accountCode);
  const normalizedPattern = canonicalAccountKey(pattern);

  if (!normalizedPattern.includes('*')) {
    return key === normalizedPattern;
  }

  const starIndex = normalizedPattern.indexOf('*');
  const prefix = normalizedPattern.slice(0, starIndex).replace(/\.$/, '');
  if (!key.startsWith(prefix)) return false;

  const suffix = key.slice(prefix.length);
  if (!suffix) return prefix === key;
  return suffix.startsWith('.');
}

type AccountBalancePair = {
  opening: number;
  closing: number;
};

function defaultBalanceMap(
  entries: BudgetAccountingJournalEntry[] | undefined,
  fiscalYear: string
): Map<string, AccountBalancePair> {
  const yearStart = `${fiscalYear}-01-01`;
  const map = new Map<string, { prior: number; movement: number }>();

  for (const entry of entries ?? []) {
    for (const line of entry.lines) {
      const code = normalizeAccountCode(line.accountCode);
      if (!code) continue;
      const current = map.get(code) ?? { prior: 0, movement: 0 };
      const delta = line.debit - line.credit;
      if (entry.date < yearStart) {
        current.prior += delta;
      } else if (entry.date.startsWith(fiscalYear)) {
        current.movement += delta;
      }
      map.set(code, current);
    }
  }

  return new Map(
    [...map.entries()].map(([accountCode, totals]) => [
      accountCode,
      { opening: totals.prior, closing: totals.prior + totals.movement },
    ])
  );
}

function signedAmountForSide(rawBalance: number, side: Form1Side): number {
  if (side === 'asset') return rawBalance;
  return -rawBalance;
}

function sumFormulaAmounts(
  formula: string,
  side: Form1Side,
  balances: Map<string, AccountBalancePair>,
  period: 'opening' | 'closing'
): number {
  const terms = formula.match(/[+-]?[^+-]+/g) ?? [];
  let total = 0;

  for (const rawTerm of terms) {
    const term = rawTerm.trim();
    if (!term) continue;
    const sign = term.startsWith('-') ? -1 : 1;
    const pattern = term.replace(/^[+-]/, '').trim();
    let termSum = 0;

    for (const [accountCode, pair] of balances.entries()) {
      if (!matchesNyahPattern(pattern, accountCode)) continue;
      termSum += signedAmountForSide(pair[period], side);
    }

    total += sign * termSum;
  }

  return Math.max(0, total);
}

function rowIndent(definition: Form1RowDefinition): number {
  if (definition.kind === 'header') {
    if (definition.id.startsWith('h-st') || definition.id.startsWith('h-lt')) return 1;
    return 0;
  }
  if (definition.kind === 'data') return 2;
  if (definition.kind === 'subtotal') return 1;
  return 0;
}

export function resolveBalanceSheetYear(
  financeContent: OrganizationSectionContent,
  reportSettings?: BalanceSheetReportSettings
): string {
  return (
    reportSettings?.fiscalYear ??
    financeContent.budgetAccountingSettings?.fiscalYear ??
    String(new Date().getFullYear())
  );
}

export function resolveBalanceSheetPeriodEnd(
  reportSettings: BalanceSheetReportSettings | undefined,
  fiscalYear: string
): string {
  if (reportSettings?.periodEnd?.trim()) return reportSettings.periodEnd.trim();
  return `${fiscalYear}-12-31`;
}

export function formatForm1Amount(value: number): string {
  return formatAmount(value);
}

export function buildBalanceSheetReport(input: {
  financeContent: OrganizationSectionContent;
  reportSettings?: BalanceSheetReportSettings;
  organizationName: string;
  rma?: string;
}): BalanceSheetReportDocument {
  const fiscalYear = resolveBalanceSheetYear(input.financeContent, input.reportSettings);
  const periodEnd = resolveBalanceSheetPeriodEnd(input.reportSettings, fiscalYear);
  const balances = defaultBalanceMap(input.financeContent.budgetAccountingJournal, fiscalYear);
  const manual = input.reportSettings?.manualRows ?? {};
  const dataAmounts = new Map<string, { opening: number; closing: number }>();

  for (const definition of FORM1_ROW_DEFINITIONS) {
    if (definition.kind !== 'data' || !definition.rowCode) continue;

    const manualValues = manual[definition.rowCode];
    let opening = manualValues?.opening ?? 0;
    let closing = manualValues?.closing ?? 0;

    if (definition.accountFormula && definition.side) {
      opening = sumFormulaAmounts(
        definition.accountFormula,
        definition.side,
        balances,
        'opening'
      );
      closing = sumFormulaAmounts(
        definition.accountFormula,
        definition.side,
        balances,
        'closing'
      );
      if (manualValues?.opening !== undefined) opening = manualValues.opening;
      if (manualValues?.closing !== undefined) closing = manualValues.closing;
    }

    dataAmounts.set(definition.rowCode, { opening, closing });
  }

  const rows: Form1ComputedRow[] = FORM1_ROW_DEFINITIONS.map((definition) => {
    let opening = 0;
    let closing = 0;

    if (definition.kind === 'data' && definition.rowCode) {
      const values = dataAmounts.get(definition.rowCode) ?? { opening: 0, closing: 0 };
      opening = values.opening;
      closing = values.closing;
    } else if (
      (definition.kind === 'subtotal' || definition.kind === 'total') &&
      definition.sumRowCodes
    ) {
      for (const code of definition.sumRowCodes) {
        const values = dataAmounts.get(code);
        if (!values) continue;
        opening += values.opening;
        closing += values.closing;
      }
    }

    return {
      id: definition.id,
      name: definition.name,
      kind: definition.kind,
      rowCode: definition.rowCode,
      opening,
      closing,
      openingFormatted: formatForm1Amount(opening),
      closingFormatted: formatForm1Amount(closing),
      indent: rowIndent(definition),
    };
  });

  const assetsRow = rows.find((row) => row.id === 't-assets');
  const liabilitiesRow = rows.find((row) => row.id === 't-liab');
  const equityRow = rows.find((row) => row.id === 't-equity');
  const liabEquityRow = rows.find((row) => row.id === 't-liab-equity');

  const trialBalance = buildTrialBalanceRows(
    input.financeContent.budgetAccountingJournal,
    fiscalYear
  );

  return {
    fiscalYear,
    periodEndLabel: periodEnd,
    organizationName: input.organizationName,
    rma: input.rma,
    instructionRef: `Дастурамал ${FINANCIAL_REPORT_INSTRUCTION.number} (${FINANCIAL_REPORT_INSTRUCTION.date})`,
    rows,
    totals: {
      assetsOpening: assetsRow?.opening ?? 0,
      assetsClosing: assetsRow?.closing ?? 0,
      liabilitiesOpening: liabilitiesRow?.opening ?? 0,
      liabilitiesClosing: liabilitiesRow?.closing ?? 0,
      equityOpening: equityRow?.opening ?? 0,
      equityClosing: equityRow?.closing ?? 0,
      balancedOpening: Math.abs((assetsRow?.opening ?? 0) - (liabEquityRow?.opening ?? 0)) < 0.01,
      balancedClosing: Math.abs((assetsRow?.closing ?? 0) - (liabEquityRow?.closing ?? 0)) < 0.01,
    },
    trialBalance,
  };
}

function buildTrialBalanceRows(
  entries: BudgetAccountingJournalEntry[] | undefined,
  fiscalYear: string
): BalanceSheetReportDocument['trialBalance'] {
  const balances = defaultBalanceMap(entries, fiscalYear);
  const turnover = computeAccountTurnover(entries, fiscalYear);
  const turnoverByCode = new Map(turnover.map((row) => [row.accountCode, row]));

  return [...balances.entries()]
    .map(([accountCode, pair]) => {
      const account = findNyahAccount(accountCode);
      const movement = turnoverByCode.get(accountCode);
      const openingDebit = pair.opening > 0 ? pair.opening : 0;
      const openingCredit = pair.opening < 0 ? -pair.opening : 0;
      const closingDebit = pair.closing > 0 ? pair.closing : 0;
      const closingCredit = pair.closing < 0 ? -pair.closing : 0;

      return {
        accountCode,
        accountName: account?.name ?? accountCode,
        openingDebit,
        openingCredit,
        debitTurnover: movement?.debitTurnover ?? 0,
        creditTurnover: movement?.creditTurnover ?? 0,
        closingDebit,
        closingCredit,
      };
    })
    .filter(
      (row) =>
        row.openingDebit > 0 ||
        row.openingCredit > 0 ||
        row.debitTurnover > 0 ||
        row.creditTurnover > 0 ||
        row.closingDebit > 0 ||
        row.closingCredit > 0
    )
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

export function isForm1Table(title: string): boolean {
  return title === FORM1_TABLE_TITLE;
}
