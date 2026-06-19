import type ExcelJS from 'exceljs';
import {
  ADSIN_MONTH_LABELS_LOWER,
  ADSIN_MONTH_LABELS_TJ,
  ADSIN_QUARTER_MONTHS,
  AdsinBenefitRow,
  AdsinStaffMovementRow,
  quarterPaymentTotal1Percent,
  quarterPaymentTotal25Percent,
  SocialInsuranceAgencyReportDocument,
} from '@/lib/social-insurance-agency-reporting';

const COLORS = {
  headerBlue: 'FF1E3A5F',
  headerYellow: 'FFFFF7D6',
  headerSoft: 'FFE8F4FC',
  white: 'FFFFFFFF',
  zebra: 'FFF8FAFC',
  totalGreen: 'FFECFDF5',
  accent: 'FF0F766E',
  textDark: 'FF1E293B',
  textMuted: 'FF64748B',
  border: 'FFCBD5E1',
} as const;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

type CellStyle = {
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
};

function fillCell(cell: ExcelJS.Cell, options: CellStyle): void {
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

function setNumber(cell: ExcelJS.Cell, value: number, style: Partial<CellStyle> = {}): void {
  fillCell(cell, {
    value: value || 0,
    numFmt: '#,##0.00',
    hAlign: 'right',
    border: thinBorder,
    ...style,
  });
}

function quarterLabel(quarter: number): string {
  return ['I', 'II', 'III', 'IV'][quarter - 1] ?? String(quarter);
}

function monthShortLabel(month: string): string {
  const index = Number.parseInt(month.slice(5, 7), 10) - 1;
  return ADSIN_MONTH_LABELS_LOWER[index] ?? month;
}

function setupSheet(sheet: ExcelJS.Worksheet, columnWidths: number[]): void {
  sheet.views = [{ showGridLines: false }];
  sheet.columns = columnWidths.map((width) => ({ width }));
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, row: number, colCount: number): void {
  for (let col = 1; col <= colCount; col += 1) {
    fillCell(sheet.getCell(row, col), {
      bold: true,
      bg: COLORS.headerBlue,
      color: COLORS.white,
      hAlign: 'center',
      wrap: true,
      border: thinBorder,
    });
  }
  sheet.getRow(row).height = 28;
}

function writeOfficialBanner(
  sheet: ExcelJS.Worksheet,
  document: SocialInsuranceAgencyReportDocument,
  appendixNo: number,
  title: string,
  colCount: number
): number {
  sheet.mergeCells(1, 1, 1, colCount);
  fillCell(sheet.getCell(1, 1), {
    value: `Замима ${appendixNo}`,
    bold: true,
    size: 13,
    bg: COLORS.headerYellow,
    hAlign: 'center',
    border: thinBorder,
  });
  sheet.getRow(1).height = 24;

  sheet.mergeCells(2, 1, 2, colCount);
  fillCell(sheet.getCell(2, 1), {
    value: title,
    bold: true,
    size: 12,
    bg: COLORS.headerYellow,
    hAlign: 'center',
    wrap: true,
    border: thinBorder,
  });
  sheet.getRow(2).height = 32;

  sheet.mergeCells(3, 1, 3, colCount);
  fillCell(sheet.getCell(3, 1), {
    value:
      'Бо фармоиши Директори Агентии суғуртаи иҷтимоиӣ ва нафақаи назди Ҳукумати Ҷумҳурии Тоҷикистон тасдиқ шудааст',
    size: 10,
    color: COLORS.textMuted,
    bg: COLORS.headerSoft,
    hAlign: 'center',
    wrap: true,
    border: thinBorder,
  });
  sheet.getRow(3).height = 36;

  sheet.mergeCells(4, 1, 4, Math.max(2, colCount - 2));
  fillCell(sheet.getCell(4, 1), {
    value: document.organizationName,
    bold: true,
    wrap: true,
    border: thinBorder,
  });

  fillCell(sheet.getCell(4, colCount - 1), {
    value: 'РМС',
    bold: true,
    bg: COLORS.headerSoft,
    hAlign: 'center',
    border: thinBorder,
  });
  fillCell(sheet.getCell(4, colCount), {
    value: document.rmsCode || '—',
    hAlign: 'center',
    border: thinBorder,
  });
  sheet.getRow(4).height = 30;

  sheet.mergeCells(5, 1, 5, colCount);
  fillCell(sheet.getCell(5, 1), {
    value: `Давраи ҳисоботӣ: семоҳаи ${quarterLabel(document.quarter)}, соли ${document.year}`,
    bold: true,
    bg: COLORS.headerSoft,
    hAlign: 'center',
    border: thinBorder,
  });
  sheet.getRow(5).height = 22;

  return 6;
}

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const sheet = workbook.addWorksheet('Ҳисобот', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });
  setupSheet(sheet, [5, 18, 14, 14, 14, 14]);

  const colCount = 6;
  let row = writeOfficialBanner(
    sheet,
    document,
    0,
    'Ҳисобот ба Агентии суғуртаи иҷтимоиӣ ва нафақа',
    colCount
  );

  sheet.mergeCells(row, 1, row, colCount);
  fillCell(sheet.getCell(row, 1), {
    value: 'Қисми 1. Шумораи кормандон ва фонди музди меҳнат (танҳо аз сабтҳои нигоҳдошташуда)',
    bold: true,
    bg: COLORS.accent,
    color: COLORS.white,
    border: thinBorder,
  });
  row += 1;

  const headers = ['Моҳ', 'Шумораи кормандон', 'Фонди музди меҳнат', '25%', '1%', 'Эзоҳ'];
  headers.forEach((header, index) => {
    fillCell(sheet.getCell(row, index + 1), {
      value: header,
      bold: true,
      bg: COLORS.headerBlue,
      color: COLORS.white,
      hAlign: 'center',
      border: thinBorder,
    });
  });
  row += 1;

  const quarterStats = document.monthlyStats.filter(
    (stat) => document.quarterMonths.includes(stat.month) && stat.hasStoredLedger
  );

  quarterStats.forEach((stat, index) => {
    const bg = index % 2 === 1 ? COLORS.zebra : COLORS.white;

    fillCell(sheet.getCell(row, 1), { value: stat.monthLabel, bg, border: thinBorder });
    fillCell(sheet.getCell(row, 2), {
      value: stat.employeeCount,
      bg,
      hAlign: 'center',
      border: thinBorder,
    });
    setNumber(sheet.getCell(row, 3), stat.payrollFund, { bg });
    setNumber(sheet.getCell(row, 4), stat.employer25, { bg });
    setNumber(sheet.getCell(row, 5), stat.employee1, { bg });
    fillCell(sheet.getCell(row, 6), {
      value: 'Сабтшуда',
      bg,
      hAlign: 'center',
      color: COLORS.textMuted,
      size: 10,
      border: thinBorder,
    });
    row += 1;
  });

  const totalsBg = COLORS.totalGreen;
  fillCell(sheet.getCell(row, 1), { value: 'Ҷамъи семоҳа', bold: true, bg: totalsBg, border: thinBorder });
  fillCell(sheet.getCell(row, 2), {
    value: document.quarterEmployeeCount,
    bold: true,
    bg: totalsBg,
    hAlign: 'center',
    border: thinBorder,
  });
  setNumber(sheet.getCell(row, 3), document.quarterPayrollFund, { bold: true, bg: totalsBg });
  setNumber(sheet.getCell(row, 4), document.calculatedQuarter.employer25, {
    bold: true,
    bg: totalsBg,
  });
  setNumber(sheet.getCell(row, 5), document.calculatedQuarter.employee1, {
    bold: true,
    bg: totalsBg,
  });
  fillCell(sheet.getCell(row, 6), { bg: totalsBg, border: thinBorder });
  row += 1;

  fillCell(sheet.getCell(row, 1), {
    value: 'Аз аввали сол',
    bold: true,
    bg: COLORS.headerSoft,
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, 2), { bg: COLORS.headerSoft, border: thinBorder });
  setNumber(sheet.getCell(row, 3), document.yearToDatePayrollFund, {
    bold: true,
    bg: COLORS.headerSoft,
  });
  setNumber(sheet.getCell(row, 4), document.calculatedYtd.employer25, {
    bold: true,
    bg: COLORS.headerSoft,
  });
  setNumber(sheet.getCell(row, 5), document.calculatedYtd.employee1, {
    bold: true,
    bg: COLORS.headerSoft,
  });
  fillCell(sheet.getCell(row, 6), { bg: COLORS.headerSoft, border: thinBorder });
}

function buildZam2Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const monthCount = document.quarterMonths.length;
  const colCount = 3 + monthCount + 1;
  const sheet = workbook.addWorksheet('Зам2', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const widths = [5, 16, 34, ...Array(monthCount).fill(12), 12];
  setupSheet(sheet, widths);

  let row = writeOfficialBanner(
    sheet,
    document,
    2,
    'Маълумоти ҷамъбастии музди меҳнати пардохтшуда',
    colCount
  );

  row += 1;
  const headerRow = row;
  const headers = [
    '№',
    'РИС (СИН)',
    'Ному насаб ва номи падар',
    ...document.quarterMonths.map(monthShortLabel),
    'Саҳмияи 1%',
  ];
  headers.forEach((header, index) => {
    fillCell(sheet.getCell(headerRow, index + 1), {
      value: header,
      bold: true,
      bg: COLORS.headerBlue,
      color: COLORS.white,
      hAlign: 'center',
      wrap: true,
      border: thinBorder,
    });
  });
  styleHeaderRow(sheet, headerRow, colCount);
  row += 1;

  document.employeeRows.forEach((employeeRow, index) => {
    const bg = index % 2 === 1 ? COLORS.zebra : COLORS.white;
    fillCell(sheet.getCell(row, 1), {
      value: employeeRow.index,
      bg,
      hAlign: 'center',
      border: thinBorder,
    });
    fillCell(sheet.getCell(row, 2), {
      value: employeeRow.ris || '—',
      bg,
      hAlign: 'center',
      border: thinBorder,
    });
    fillCell(sheet.getCell(row, 3), {
      value: employeeRow.fullName,
      bg,
      wrap: true,
      border: thinBorder,
    });
    document.quarterMonths.forEach((month, monthIndex) => {
      setNumber(sheet.getCell(row, 4 + monthIndex), employeeRow.monthlyGross[month] ?? 0, { bg });
    });
    setNumber(
      sheet.getCell(row, colCount),
      employeeRow.socialInsurance1Percent,
      { bg, bold: false }
    );
    sheet.getRow(row).height = 22;
    row += 1;
  });

  fillCell(sheet.getCell(row, 1), { bg: COLORS.totalGreen, border: thinBorder });
  fillCell(sheet.getCell(row, 2), { bg: COLORS.totalGreen, border: thinBorder });
  fillCell(sheet.getCell(row, 3), {
    value: 'Ҷамъ:',
    bold: true,
    bg: COLORS.totalGreen,
    hAlign: 'right',
    border: thinBorder,
  });
  document.quarterMonths.forEach((month, monthIndex) => {
    const total = document.employeeRows.reduce(
      (sum, item) => sum + (item.monthlyGross[month] ?? 0),
      0
    );
    setNumber(sheet.getCell(row, 4 + monthIndex), total, { bold: true, bg: COLORS.totalGreen });
  });
  setNumber(sheet.getCell(row, colCount), document.calculatedQuarter.employee1, {
    bold: true,
    bg: COLORS.totalGreen,
  });
  sheet.getRow(row).height = 24;
}

function buildZam1Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const sheet = workbook.addWorksheet('Зам1', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  setupSheet(sheet, [22, 12, 14, 12, 14, 12, 14, 12, 14, 12, 14, 14, 14]);

  let row = writeOfficialBanner(
    sheet,
    document,
    1,
    'Шумораи шахсони суғурташуда ва фонди умумии музди меҳнат',
    13
  );

  row += 1;
  const quarterIndex = document.quarter - 1;
  const colStarts = [1, 4, 7, 10];
  const colStart = colStarts[quarterIndex];

  fillCell(sheet.getCell(row, colStart), {
    value: 'Моҳ',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, colStart + 1), {
    value: 'Шумора',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, colStart + 2), {
    value: 'ФММ',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, 13), {
    value: 'Аз аввали сол',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  row += 1;

  const monthsInQuarter = ADSIN_QUARTER_MONTHS[document.quarter];
  monthsInQuarter.forEach((monthNum, offset) => {
    const stat = document.monthlyStats[monthNum - 1];
    const dataRow = row + offset;
    const bg = offset % 2 === 1 ? COLORS.zebra : COLORS.white;
    if (!stat.hasStoredLedger) return;

    fillCell(sheet.getCell(dataRow, colStart), {
      value: stat.monthLabel,
      bg,
      border: thinBorder,
    });
    fillCell(sheet.getCell(dataRow, colStart + 1), {
      value: stat.employeeCount,
      bg,
      hAlign: 'center',
      border: thinBorder,
    });
    setNumber(sheet.getCell(dataRow, colStart + 2), stat.payrollFund, { bg });
    if (offset === 0) {
      setNumber(sheet.getCell(dataRow, 13), document.yearToDatePayrollFund, { bg });
    }
  });

  row += 4;
  const settings = document.settings;
  const ytd = document.calculatedYtd;
  const rows: Array<{ label: string; code?: string; v25?: number; v1?: number }> = [
    { label: 'Саҳмҳои ҳисобшуда аз аввали сол', v25: ytd.employer25, v1: ytd.employee1 },
    { label: 'Бозҳисоб (+)', v25: settings.recalculatedPlus25, v1: settings.recalculatedPlus1 },
    { label: 'Бозҳисоб (−)', v25: settings.recalculatedMinus25, v1: settings.recalculatedMinus1 },
    { label: 'Ҷарима', v25: settings.penalty25, v1: settings.penalty1 },
    { label: 'Пардохт аз аввали сол', v25: settings.paidYtd25 ?? quarterPaymentTotal25Percent(document), v1: settings.paidYtd1 ?? quarterPaymentTotal1Percent(document) },
  ];

  fillCell(sheet.getCell(row, 1), {
    value: 'Ҳисоби саҳмҳои суғуртаи иҷтимоиӣ',
    bold: true,
    bg: COLORS.accent,
    color: COLORS.white,
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, 9), {
    value: '25%',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, 11), {
    value: '1%',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  row += 1;

  rows.forEach((entry, index) => {
    const bg = index % 2 === 1 ? COLORS.zebra : COLORS.white;
    fillCell(sheet.getCell(row, 1), { value: entry.label, bg, border: thinBorder });
    setNumber(sheet.getCell(row, 9), entry.v25 ?? 0, { bg });
    setNumber(sheet.getCell(row, 11), entry.v1 ?? 0, { bg });
    row += 1;
  });
}

function buildZam3Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const monthCount = document.quarterMonths.length;
  const colCount = 3 + monthCount + 1;
  const sheet = workbook.addWorksheet('Зам3', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });
  setupSheet(sheet, [5, 16, 30, ...Array(monthCount).fill(12), 12]);

  let row = writeOfficialBanner(
    sheet,
    document,
    3,
    'Маълумоти ҷамъбасти оиди кӯмакпулиҳои пардохтшуда',
    colCount
  );

  if (document.benefitRows.length === 0) {
    sheet.mergeCells(row, 1, row, colCount);
    fillCell(sheet.getCell(row, 1), {
      value: 'Дар ин семоҳа кӯмакпулӣ сабт нашудааст',
      hAlign: 'center',
      color: COLORS.textMuted,
      border: thinBorder,
    });
    return;
  }

  const categories: AdsinBenefitRow['category'][] = [
    'sick_temporary',
    'maternity_birth',
    'childcare_under_1_5',
    'funeral',
  ];

  for (const category of categories) {
    const categoryRows = document.benefitRows.filter((item) => item.category === category);
    if (categoryRows.length === 0) continue;

    row += 1;
    sheet.mergeCells(row, 1, row, colCount);
    fillCell(sheet.getCell(row, 1), {
      value: categoryRows[0].categoryLabel,
      bold: true,
      bg: COLORS.headerSoft,
      border: thinBorder,
    });
    row += 1;

    const headerRow = row;
    ['№', 'РИС', 'Ному насаб', ...document.quarterMonths.map(monthShortLabel), 'Ҳамагӣ'].forEach(
      (header, index) => {
        fillCell(sheet.getCell(headerRow, index + 1), {
          value: header,
          bold: true,
          bg: COLORS.headerBlue,
          color: COLORS.white,
          hAlign: 'center',
          border: thinBorder,
        });
      }
    );
    row += 1;

    categoryRows.forEach((benefitRow, index) => {
      const bg = index % 2 === 1 ? COLORS.zebra : COLORS.white;
      fillCell(sheet.getCell(row, 1), { value: benefitRow.index, bg, hAlign: 'center', border: thinBorder });
      fillCell(sheet.getCell(row, 2), { value: benefitRow.ris || '—', bg, hAlign: 'center', border: thinBorder });
      fillCell(sheet.getCell(row, 3), { value: benefitRow.fullName, bg, wrap: true, border: thinBorder });
      document.quarterMonths.forEach((month, monthIndex) => {
        setNumber(sheet.getCell(row, 4 + monthIndex), benefitRow.monthlyAmounts[month] ?? 0, { bg });
      });
      setNumber(sheet.getCell(row, colCount), benefitRow.total, { bg });
      row += 1;
    });
    row += 1;
  }
}

function buildZam4Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const sheet = workbook.addWorksheet('зам4', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });
  setupSheet(sheet, [5, 16, 34, 4, 14, 24]);

  let row = writeOfficialBanner(
    sheet,
    document,
    4,
    'Маълумотнома оиди рафту омади кормандон',
    6
  );

  const sections: Array<{ kind: AdsinStaffMovementRow['kind']; title: string }> = [
    { kind: 'dismissed', title: 'Аз кор озод карда шуданд' },
    { kind: 'hired', title: 'Ба кор қабул карда шуданд' },
  ];

  for (const section of sections) {
    const items = document.staffMovements.filter((item) => item.kind === section.kind);
    row += 1;
    sheet.mergeCells(row, 1, row, 6);
    fillCell(sheet.getCell(row, 1), {
      value: section.title,
      bold: true,
      bg: COLORS.headerSoft,
      border: thinBorder,
    });
    row += 1;

    ['№', 'РИС', 'Ному насаб', '', 'Сана', 'Сабаб'].forEach((header, index) => {
      fillCell(sheet.getCell(row, index + 1), {
        value: header,
        bold: true,
        bg: COLORS.headerBlue,
        color: COLORS.white,
        hAlign: 'center',
        border: thinBorder,
      });
    });
    row += 1;

    if (items.length === 0) {
      sheet.mergeCells(row, 1, row, 6);
      fillCell(sheet.getCell(row, 1), {
        value: '—',
        hAlign: 'center',
        color: COLORS.textMuted,
        border: thinBorder,
      });
      row += 1;
      continue;
    }

    items.forEach((movement, index) => {
      const bg = index % 2 === 1 ? COLORS.zebra : COLORS.white;
      fillCell(sheet.getCell(row, 1), { value: movement.index, bg, hAlign: 'center', border: thinBorder });
      fillCell(sheet.getCell(row, 2), { value: movement.ris || '—', bg, hAlign: 'center', border: thinBorder });
      fillCell(sheet.getCell(row, 3), { value: movement.fullName, bg, wrap: true, border: thinBorder });
      fillCell(sheet.getCell(row, 4), { bg, border: thinBorder });
      fillCell(sheet.getCell(row, 5), { value: movement.eventDate || '—', bg, hAlign: 'center', border: thinBorder });
      fillCell(sheet.getCell(row, 6), { value: movement.reason, bg, wrap: true, border: thinBorder });
      row += 1;
    });
  }
}

function buildPaymentSheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument,
  appendixNo: 5 | 6,
  rateLabel: string,
  records: SocialInsuranceAgencyReportDocument['paymentRecords1Percent']
): void {
  const sheetName = appendixNo === 5 ? 'зам5' : 'зам6';
  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });
  setupSheet(sheet, [18, 14, 14, 14, 14]);

  let row = writeOfficialBanner(
    sheet,
    document,
    appendixNo,
    `Маълумот оиди пардохти саҳмҳои суғуртавии ${rateLabel}`,
    5
  );

  row += 1;
  fillCell(sheet.getCell(row, 1), {
    value: 'Рақами варақа',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, 2), {
    value: 'Санаи пардохт',
    bold: true,
    bg: COLORS.headerBlue,
    color: COLORS.white,
    hAlign: 'center',
    border: thinBorder,
  });
  document.quarterMonths.forEach((month, index) => {
    fillCell(sheet.getCell(row, 3 + index), {
      value: monthShortLabel(month),
      bold: true,
      bg: COLORS.headerBlue,
      color: COLORS.white,
      hAlign: 'center',
      border: thinBorder,
    });
  });
  row += 1;

  const monthTotals = Object.fromEntries(document.quarterMonths.map((month) => [month, 0]));

  if (records.length === 0) {
    sheet.mergeCells(row, 1, row, 5);
    fillCell(sheet.getCell(row, 1), {
      value: 'Пардохт сабт нашудааст',
      hAlign: 'center',
      color: COLORS.textMuted,
      border: thinBorder,
    });
    row += 1;
  } else {
    records.forEach((record, index) => {
      const bg = index % 2 === 1 ? COLORS.zebra : COLORS.white;
      fillCell(sheet.getCell(row, 1), {
        value: record.paymentSlipNumber ?? '',
        bg,
        hAlign: 'center',
        border: thinBorder,
      });
      fillCell(sheet.getCell(row, 2), {
        value: record.paymentDate ?? '',
        bg,
        hAlign: 'center',
        border: thinBorder,
      });
      document.quarterMonths.forEach((month, monthIndex) => {
        const amount = record.monthAmounts?.[month] ?? 0;
        setNumber(sheet.getCell(row, 3 + monthIndex), amount, { bg });
        monthTotals[month] += amount;
      });
      row += 1;
    });
  }

  fillCell(sheet.getCell(row, 1), {
    value: 'Ҷамъ:',
    bold: true,
    bg: COLORS.totalGreen,
    hAlign: 'right',
    border: thinBorder,
  });
  fillCell(sheet.getCell(row, 2), { bg: COLORS.totalGreen, border: thinBorder });
  document.quarterMonths.forEach((month, index) => {
    setNumber(sheet.getCell(row, 3 + index), monthTotals[month], {
      bold: true,
      bg: COLORS.totalGreen,
    });
  });
}

export function adsinExportFileName(document: SocialInsuranceAgencyReportDocument): string {
  return `adsin-${document.year}-Q${document.quarter}.xlsx`;
}

export async function downloadSocialInsuranceAgencyExcel(
  document: SocialInsuranceAgencyReportDocument
): Promise<void> {
  const ExcelJSModule = (await import('exceljs')).default;
  const workbook = new ExcelJSModule.Workbook();
  workbook.creator = 'my-yoqubkhoja-tj';
  workbook.created = new Date();

  buildSummarySheet(workbook, document);
  buildZam1Sheet(workbook, document);
  buildZam2Sheet(workbook, document);
  buildZam3Sheet(workbook, document);
  buildZam4Sheet(workbook, document);
  buildPaymentSheet(workbook, document, 5, '1%', document.paymentRecords1Percent);
  buildPaymentSheet(workbook, document, 6, '25%', document.paymentRecords25Percent);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = adsinExportFileName(document);
  link.click();
  URL.revokeObjectURL(url);
}

export function formatAdsinAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export { ADSIN_MONTH_LABELS_TJ };
