import type ExcelJS from 'exceljs';
import {
  calcEntryTotals,
  formatLedgerAmount,
  mergePayrollLedgerForMonth,
} from '@/lib/finance-payroll-ledger';
import {
  collectSocialInsuranceBankPayments,
  socialInsurancePurposeTj,
} from '@/lib/finance-social-insurance-pay';
import { activeEmployees } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent, StaffEmployee } from '@/types/organization-section';

export type BankPaymentSource = 'salary' | 'social_insurance';

export type BankPaymentRow = {
  index: number;
  rowKey: string;
  employee: StaffEmployee;
  bankAccount: string;
  netPay: number;
  monthLabel: string;
  purpose: string;
  source: BankPaymentSource;
  importReady: boolean;
};

export type BankPaymentDocument = {
  month: string;
  monthLabel: string;
  periodLabel: string;
  year: string;
  preparedAt: string;
  organizationName: string;
  rows: BankPaymentRow[];
  totalNetPay: number;
  totalInWords: string;
  missingAccounts: number;
};

const TAJIK_MONTHS = [
  'январ',
  'феврал',
  'март',
  'апрел',
  'май',
  'июн',
  'июл',
  'август',
  'сентябр',
  'октябр',
  'ноябр',
  'декабр',
] as const;

export type BankPaymentExportLabels = {
  sheetPrint: string;
  sheetImport: string;
  documentTitle: string;
  forMonthYear: string;
  preparedAt: string;
  colNo: string;
  colAccount: string;
  colAmount: string;
  colName: string;
  colPurpose: string;
  total: string;
  totalInWords: string;
  director: string;
  accountant: string;
  accountantRole: string;
  directorName: string;
  accountantName: string;
};

export function getBankPaymentExportLabels(names: {
  directorName: string;
  accountantName: string;
}): BankPaymentExportLabels {
  return {
    sheetPrint: 'Варақа',
    sheetImport: 'Импорт',
    documentTitle: 'Пардохт ба кормандони «{organization}» (музди меҳнат ва суғуртаи иҷтимоӣ)',
    forMonthYear: 'барои моҳи {month} соли {year}',
    preparedAt: 'Санаи тартиб додани ҳуҷҷат',
    colNo: '№',
    colAccount: 'Рақами суратҳисоби бонкии корманд',
    colAmount: 'Маблағи пардохт',
    colName: 'Ном, насаб ва номи падар',
    colPurpose: 'Тавзеҳи пардохт',
    total: 'Ҳамагӣ',
    totalInWords: 'Бо ҳарф',
    director: 'Сардор',
    accountant: 'Сармуҳосиб',
    accountantRole: 'Мудири бахш — Сармуҳосиб',
    directorName: names.directorName,
    accountantName: names.accountantName,
  };
}

function formatMonthNameTj(monthKey: string): string {
  const month = Number(monthKey.split('-')[1]);
  return TAJIK_MONTHS[month - 1] ?? monthKey;
}

function formatPeriodLabelTj(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `барои моҳи ${TAJIK_MONTHS[Number(month) - 1]} соли ${year}`;
}

function formatDateTj(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

function rowHeightForText(text: string, charsPerLine: number, lineHeight: number, min: number): number {
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return Math.max(min, lines * lineHeight + 6);
}

const ONES = [
  'нол',
  'як',
  'ду',
  'се',
  'чор',
  'панҷ',
  'шаш',
  'ҳафт',
  'ҳашт',
  'нӯҳ',
  'даҳ',
  'ёздаҳ',
  'дувоздаҳ',
  'сенздаҳ',
  'чордаҳ',
  'понздаҳ',
  'шонздаҳ',
  'ҳабдаҳ',
  'ҳаждаҳ',
  'нуздаҳ',
] as const;

const TENS = ['', '', 'бист', 'си', 'чил', 'панҷоҳ', 'шаст', 'ҳафтод', 'ҳаштод', 'навад'] as const;

const HUNDREDS = [
  '',
  '\u0441\u0430\u0434',
  '\u0434\u0443\u0441\u0430\u0434',
  '\u0441\u0435\u0441\u0430\u0434',
  '\u0447\u043e\u0440\u0441\u0430\u0434',
  '\u043f\u0430\u043d\u0436\u0441\u0430\u0434',
  '\u0448\u0430\u0448\u0441\u0430\u0434',
  '\u04b3\u0430\u0444\u0442\u0441\u0430\u0434',
  '\u04b3\u0430\u0448\u0442\u0441\u0430\u0434',
  '\u043d\u04e3\u0445\u0441\u0430\u0434',
] as const;

function withU(word: string): string {
  return word.endsWith('\u0443') ? word : `${word}\u0443`;
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function hundredWord(hundreds: number, hasRest: boolean): string {
  if (hundreds === 1) {
    return hasRest ? '\u044f\u043a \u0441\u0430\u0434' : '\u0441\u0430\u0434';
  }
  return HUNDREDS[hundreds];
}

function tripleToWords(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  const parts: string[] = [];
  const hasRest = tens > 0 || ones > 0;

  if (hundreds) parts.push(hundredWord(hundreds, hasRest));

  if (tens >= 2) {
    parts.push(ones ? `${withU(TENS[tens])} ${ONES[ones]}` : TENS[tens]);
  } else if (tens === 1) {
    parts.push(ONES[10 + ones]);
  } else if (ones) {
    parts.push(ONES[ones]);
  }

  if (parts.length === 1) return parts[0];
  if (hundreds) return `${withU(parts[0])} ${parts.slice(1).join(' ')}`;
  return parts.join(' ');
}

const HAZOR = '\u04b3\u0430\u0437\u043e\u0440';
const HAZORU = '\u04b3\u0430\u0437\u043e\u0440\u0443';
const MILLION = '\u043c\u0438\u043b\u043b\u0438\u043e\u043d';
const MILLIONU = '\u043c\u0438\u043b\u043b\u0438\u043e\u043d\u0443';

function integerToWords(n: number): string {
  if (n === 0) return '\u043d\u043e\u043b';

  const parts: string[] = [];
  let rest = n;

  const millions = Math.floor(rest / 1_000_000);
  if (millions) {
    parts.push(millions === 1 ? `\u044f\u043a ${MILLION}` : `${tripleToWords(millions)} ${MILLION}`);
    rest %= 1_000_000;
  }

  const thousands = Math.floor(rest / 1000);
  if (thousands) {
    parts.push(thousands === 1 ? `\u044f\u043a ${HAZOR}` : `${tripleToWords(thousands)} ${HAZOR}`);
    rest %= 1000;
  }

  if (rest > 0) {
    if (parts.length > 0) {
      const lastIndex = parts.length - 1;
      if (rest < 100) {
        parts[lastIndex] = parts[lastIndex]
          .replace(HAZOR, HAZORU)
          .replace(MILLION, MILLIONU);
        parts.push('\u0432\u0430', tripleToWords(rest));
      } else {
        parts[lastIndex] = parts[lastIndex]
          .replace(HAZOR, HAZORU)
          .replace(MILLION, MILLIONU);
        parts.push(tripleToWords(rest));
      }
    } else {
      parts.push(tripleToWords(rest));
    }
  }

  return parts.join(' ');
}

export function amountInWordsTj(amount: number): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const somoni = Math.floor(rounded);
  const diram = Math.round((rounded - somoni) * 100);
  const somoniWords = capitalizeFirst(integerToWords(somoni));
  const diramText = String(diram).padStart(2, '0');
  return `${somoniWords} \u0441\u043e\u043c\u043e\u043d\u04e3 ${diramText} \u0434\u0438\u0440\u0430\u043c`;
}

export function buildBankPaymentDocument(
  financeContent: OrganizationSectionContent,
  staffContent: OrganizationSectionContent,
  month: string,
  organization?: Organization
): BankPaymentDocument {
  const ledger = mergePayrollLedgerForMonth(financeContent.payrollLedgers, month, staffContent, {
    positionHandovers: financeContent.positionHandovers,
    laborLeaves: financeContent.laborLeaves,
    payrollLedgers: financeContent.payrollLedgers,
  });

  const employees = activeEmployees(staffContent.employees);
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const monthLabel = formatMonthNameTj(month);
  const year = month.slice(0, 4);
  const periodLabel = formatPeriodLabelTj(month);
  const preparedAt = formatDateTj(new Date(ledger.preparedAt ?? Date.now()));

  const purposeSalary = `Музди маош барои моҳи ${monthLabel} соли ${year}`;

  type DraftBankPaymentRow = Omit<BankPaymentRow, 'index'>;

  const salaryRows = ledger.entries.flatMap((entry): DraftBankPaymentRow[] => {
    const employee = employeeMap.get(entry.employeeId);
    if (!employee) return [];
    const { netPay } = calcEntryTotals(entry);
    if (netPay <= 0) return [];
    const bankAccount = (employee.bankAccount ?? '').replace(/\D/g, '');
    return [
      {
        rowKey: `salary-${entry.employeeId}`,
        employee,
        bankAccount,
        netPay,
        monthLabel,
        purpose: purposeSalary,
        source: 'salary',
        importReady: bankAccount.length === 20,
      },
    ];
  });

  const socialRows = collectSocialInsuranceBankPayments(
    financeContent.laborLeaves,
    staffContent,
    financeContent.payrollLedgers,
    month
  )
    .flatMap((payment): DraftBankPaymentRow[] => {
      const employee = employeeMap.get(payment.employeeId);
      if (!employee) return [];
      const bankAccount = (employee.bankAccount ?? '').replace(/\D/g, '');
      return [
        {
          rowKey: `social-${payment.leaveId}-${month}`,
          employee,
          bankAccount,
          netPay: payment.amount,
          monthLabel,
          purpose: socialInsurancePurposeTj(payment.kind, monthLabel, year),
          source: 'social_insurance',
          importReady: bankAccount.length === 20,
        },
      ];
    });

  const rows = [...salaryRows, ...socialRows]
    .sort((a, b) => {
      const nameCompare = a.employee.fullName.localeCompare(b.employee.fullName, 'tg');
      if (nameCompare !== 0) return nameCompare;
      if (a.source === b.source) return 0;
      return a.source === 'salary' ? -1 : 1;
    })
    .map((row, index) => ({ ...row, index: index + 1 }));

  const totalNetPay = rows.reduce((sum, row) => sum + row.netPay, 0);
  const missingAccounts = rows.filter((row) => !row.importReady).length;

  return {
    month,
    monthLabel,
    periodLabel,
    year,
    preparedAt,
    organizationName: organization?.name ?? '',
    rows,
    totalNetPay,
    totalInWords: amountInWordsTj(totalNetPay),
    missingAccounts,
  };
}

export function bankPaymentFileName(month: string): string {
  return `pardokh-bank-${month}.xlsx`;
}

const COLORS = {
  headerYellow: 'FFFFF2CC',
  headerBlue: 'FFDDEBF7',
  headerImport: 'FF1E3A5F',
  white: 'FFFFFFFF',
  zebra: 'FFF8FAFC',
  textDark: 'FF1E293B',
  textMuted: 'FF64748B',
  border: 'FFCBD5E1',
  totalGreen: 'FFECFDF5',
} as const;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

function fillCell(
  cell: ExcelJS.Cell,
  options: {
    value?: ExcelJS.CellValue;
    bold?: boolean;
    size?: number;
    color?: string;
    bg?: string;
    hAlign?: ExcelJS.Alignment['horizontal'];
    vAlign?: ExcelJS.Alignment['vertical'];
    wrap?: boolean;
    numFmt?: string;
    border?: Partial<ExcelJS.Borders>;
  }
) {
  if (options.value !== undefined) cell.value = options.value;
  cell.font = {
    name: 'Times New Roman',
    size: options.size ?? 11,
    bold: options.bold ?? false,
    color: { argb: options.color ?? COLORS.textDark },
  };
  cell.alignment = {
    horizontal: options.hAlign ?? 'left',
    vertical: options.vAlign ?? 'middle',
    wrapText: options.wrap ?? false,
  };
  if (options.bg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.bg } };
  }
  if (options.numFmt) cell.numFmt = options.numFmt;
  if (options.border) cell.border = options.border;
}

async function buildPrintSheet(
  workbook: ExcelJS.Workbook,
  document: BankPaymentDocument,
  labels: BankPaymentExportLabels,
  sheetName: string
) {
  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    views: [{ showGridLines: false }],
  });

  sheet.columns = [
    { width: 6 },
    { width: 30 },
    { width: 15 },
    { width: 40 },
    { width: 48 },
  ];

  const title = labels.documentTitle.replace('{organization}', document.organizationName);
  const period = document.periodLabel;

  sheet.mergeCells('A1:E1');
  fillCell(sheet.getCell('A1'), {
    value: title,
    bold: true,
    size: 12,
    bg: COLORS.headerYellow,
    hAlign: 'center',
    wrap: true,
    border: thinBorder,
  });
  sheet.getRow(1).height = 42;

  sheet.mergeCells('A2:E2');
  fillCell(sheet.getCell('A2'), {
    value: period,
    bold: true,
    size: 11,
    bg: COLORS.headerYellow,
    hAlign: 'center',
    border: thinBorder,
  });
  sheet.getRow(2).height = 26;

  sheet.mergeCells('A3:E3');
  fillCell(sheet.getCell('A3'), {
    value: `${labels.preparedAt}: ${document.preparedAt}`,
    bg: COLORS.headerYellow,
    wrap: true,
    border: thinBorder,
  });
  sheet.getRow(3).height = rowHeightForText(`${labels.preparedAt}: ${document.preparedAt}`, 70, 16, 28);

  const headerRow = 5;
  const headers = [
    labels.colNo,
    labels.colAccount,
    labels.colAmount,
    labels.colName,
    labels.colPurpose,
  ];
  headers.forEach((header, index) => {
    fillCell(sheet.getCell(headerRow, index + 1), {
      value: header,
      bold: true,
      size: 10,
      bg: COLORS.headerBlue,
      hAlign: 'center',
      wrap: true,
      border: thinBorder,
    });
  });
  sheet.getRow(headerRow).height = 44;

  const dataStart = headerRow + 1;

  document.rows.forEach((row, i) => {
    const rowNumber = dataStart + i;
    const bg = i % 2 === 1 ? COLORS.zebra : COLORS.white;

    fillCell(sheet.getCell(rowNumber, 1), {
      value: row.index,
      bg,
      hAlign: 'center',
      border: thinBorder,
    });
    fillCell(sheet.getCell(rowNumber, 2), {
      value: row.bankAccount || '',
      bg,
      hAlign: 'center',
      border: thinBorder,
    });
    if (row.bankAccount) sheet.getCell(rowNumber, 2).numFmt = '@';

    fillCell(sheet.getCell(rowNumber, 3), {
      value: row.netPay,
      bg,
      hAlign: 'right',
      border: thinBorder,
      numFmt: '#,##0.00',
    });
    fillCell(sheet.getCell(rowNumber, 4), {
      value: row.employee.fullName,
      bg,
      wrap: true,
      border: thinBorder,
    });
    fillCell(sheet.getCell(rowNumber, 5), {
      value: row.purpose,
      bg,
      wrap: true,
      border: thinBorder,
    });
    sheet.getRow(rowNumber).height = rowHeightForText(row.purpose, 42, 14, 22);
  });

  const totalRow = dataStart + document.rows.length + 1;
  sheet.mergeCells(totalRow, 1, totalRow, 2);
  fillCell(sheet.getCell(totalRow, 1), {
    value: labels.total,
    bold: true,
    bg: COLORS.totalGreen,
    hAlign: 'right',
    border: thinBorder,
  });
  fillCell(sheet.getCell(totalRow, 3), {
    value: document.totalNetPay,
    bold: true,
    bg: COLORS.totalGreen,
    hAlign: 'right',
    numFmt: '#,##0.00',
    border: thinBorder,
  });
  fillCell(sheet.getCell(totalRow, 4), { bg: COLORS.totalGreen, border: thinBorder });
  fillCell(sheet.getCell(totalRow, 5), { bg: COLORS.totalGreen, border: thinBorder });
  sheet.getRow(totalRow).height = 24;

  const wordsRow = totalRow + 1;
  sheet.mergeCells(wordsRow, 1, wordsRow, 2);
  fillCell(sheet.getCell(wordsRow, 1), {
    value: `${labels.totalInWords}:`,
    bold: true,
    bg: COLORS.headerYellow,
    wrap: true,
    vAlign: 'top',
    border: thinBorder,
  });
  sheet.mergeCells(wordsRow, 3, wordsRow, 5);
  fillCell(sheet.getCell(wordsRow, 3), {
    value: document.totalInWords,
    bg: COLORS.headerYellow,
    wrap: true,
    vAlign: 'top',
    border: thinBorder,
  });
  sheet.getRow(wordsRow).height = rowHeightForText(document.totalInWords, 55, 18, 36);

  const signRow = wordsRow + 2;
  sheet.mergeCells(signRow, 1, signRow, 2);
  sheet.mergeCells(signRow, 4, signRow, 5);
  fillCell(sheet.getCell(signRow, 1), {
    value: labels.director,
    bold: true,
    color: COLORS.textMuted,
  });
  fillCell(sheet.getCell(signRow, 4), {
    value: labels.accountantRole,
    bold: true,
    wrap: true,
    color: COLORS.textMuted,
  });
  sheet.getRow(signRow).height = 28;

  const signLineRow = signRow + 2;
  sheet.mergeCells(signLineRow, 1, signLineRow, 2);
  sheet.mergeCells(signLineRow, 4, signLineRow, 5);
  fillCell(sheet.getCell(signLineRow, 1), {
    value: labels.directorName,
    hAlign: 'center',
    border: {
      top: { style: 'thin', color: { argb: COLORS.textDark } },
    } as Partial<ExcelJS.Borders>,
  });
  fillCell(sheet.getCell(signLineRow, 4), {
    value: labels.accountantName,
    hAlign: 'center',
    border: {
      top: { style: 'thin', color: { argb: COLORS.textDark } },
    } as Partial<ExcelJS.Borders>,
  });
}

async function buildImportSheet(
  workbook: ExcelJS.Workbook,
  document: BankPaymentDocument,
  labels: BankPaymentExportLabels,
  sheetName: string
) {
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { width: 26 },
    { width: 16 },
    { width: 38 },
    { width: 52 },
  ];

  const headers = [labels.colAccount, labels.colAmount, labels.colName, labels.colPurpose];
  headers.forEach((header, index) => {
    fillCell(sheet.getCell(1, index + 1), {
      value: header,
      bold: true,
      size: 11,
      color: COLORS.white,
      bg: COLORS.headerImport,
      hAlign: 'center',
      wrap: true,
      border: thinBorder,
    });
  });
  sheet.getRow(1).height = 32;

  const importRows = document.rows.filter((row) => row.importReady);
  importRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const bg = index % 2 === 1 ? COLORS.zebra : COLORS.white;

    fillCell(sheet.getCell(rowNumber, 1), {
      value: row.bankAccount,
      bg,
      hAlign: 'center',
      border: thinBorder,
    });
    sheet.getCell(rowNumber, 1).numFmt = '@';

    fillCell(sheet.getCell(rowNumber, 2), {
      value: row.netPay,
      bg,
      hAlign: 'right',
      border: thinBorder,
      numFmt: '#,##0.00',
    });
    fillCell(sheet.getCell(rowNumber, 3), {
      value: row.employee.fullName,
      bg,
      wrap: true,
      border: thinBorder,
    });
    fillCell(sheet.getCell(rowNumber, 4), {
      value: row.purpose,
      bg,
      wrap: true,
      border: thinBorder,
    });
    sheet.getRow(rowNumber).height = 22;
  });

  if (importRows.length > 0) {
    const importTotal = importRows.reduce((sum, row) => sum + row.netPay, 0);
    const totalRow = importRows.length + 3;
    fillCell(sheet.getCell(totalRow, 1), {
      value: labels.total,
      bold: true,
      bg: COLORS.totalGreen,
      hAlign: 'right',
      border: thinBorder,
    });
    fillCell(sheet.getCell(totalRow, 2), {
      value: importTotal,
      bold: true,
      bg: COLORS.totalGreen,
      hAlign: 'right',
      numFmt: '#,##0.00',
      border: thinBorder,
    });
    sheet.mergeCells(totalRow, 3, totalRow, 4);
    fillCell(sheet.getCell(totalRow, 3), { bg: COLORS.totalGreen, border: thinBorder });
  }

  if (importRows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: importRows.length + 1, column: 4 },
    };
  }
}

export async function downloadBankPaymentExcel(
  document: BankPaymentDocument,
  labels: BankPaymentExportLabels
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'my-yoqubkhoja-tj';
  workbook.created = new Date();

  await buildPrintSheet(workbook, document, labels, labels.sheetPrint);
  await buildImportSheet(workbook, document, labels, labels.sheetImport);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = bankPaymentFileName(document.month);
  link.click();
  URL.revokeObjectURL(url);
}

export function formatBankPaymentAmount(value: number): string {
  return formatLedgerAmount(value);
}

export function resolveBankPaymentMonth(
  financeContent: OrganizationSectionContent,
  preferred?: string | null
): string {
  if (preferred) return preferred;
  const ledgers = financeContent.payrollLedgers ?? [];
  if (ledgers.length === 0) return new Date().toISOString().slice(0, 7);
  return [...ledgers].sort((a, b) => b.month.localeCompare(a.month))[0].month;
}
