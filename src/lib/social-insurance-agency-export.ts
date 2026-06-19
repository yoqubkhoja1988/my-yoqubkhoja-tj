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

function setCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | number | undefined | null
): void {
  if (value === undefined || value === null || value === '') return;
  sheet.getCell(row, col).value = value;
}

function setNumber(sheet: ExcelJS.Worksheet, row: number, col: number, value: number): void {
  if (!value) return;
  sheet.getCell(row, col).value = value;
  sheet.getCell(row, col).numFmt = '#,##0.00';
}

function appendixHeader(sheet: ExcelJS.Worksheet, appendixNo: number, titleCol: number): void {
  setCell(sheet, 2, titleCol, 'Бо фармоиши Директори Агентии суғуртаи иҷтимои ва нафақаи');
  setCell(sheet, 3, titleCol, 'назди Ҳукумати Ҷумҳурии Тоҷикистон аз "_______" Июли соли 2014 №_______');
  setCell(sheet, 4, titleCol, 'тасдиқ шудааст');
  setCell(sheet, 1, titleCol + 2, `Замима ${appendixNo}`);
}

function fillOrganizationBlock(
  sheet: ExcelJS.Worksheet,
  document: SocialInsuranceAgencyReportDocument,
  nameRow: number,
  nameCol: number,
  rmsRow: number,
  rmsCol: number
): void {
  setCell(sheet, nameRow, nameCol, document.organizationName);
  setCell(sheet, rmsRow, rmsCol, 'РМС');
  setCell(sheet, rmsRow, rmsCol + 1, document.rmsCode);
  if (document.ryam) {
    setCell(sheet, nameRow + 1, rmsCol, 'РЯМ');
    setCell(sheet, nameRow + 1, rmsCol + 1, document.ryam);
  }
}

function buildZam1Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const sheet = workbook.addWorksheet('Зам1');
  appendixHeader(sheet, 1, 10);
  fillOrganizationBlock(sheet, document, 6, 3, 6, 12);

  const quarterRowMap: Record<number, number[]> = {
    1: [11, 12, 13],
    2: [11, 12, 13],
    3: [11, 12, 13],
    4: [11, 12, 13],
  };
  const quarterColStarts = [1, 4, 7, 10];

  for (let quarterIndex = 0; quarterIndex < 4; quarterIndex += 1) {
    const monthsInQuarter = ADSIN_QUARTER_MONTHS[(quarterIndex + 1) as 1 | 2 | 3 | 4];
    const colStart = quarterColStarts[quarterIndex];
    for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
      const monthIndex = monthsInQuarter[rowOffset] - 1;
      const stat = document.monthlyStats[monthIndex];
      const row = quarterRowMap[1][rowOffset];
      setCell(sheet, row, colStart, stat.monthLabel);
      setNumber(sheet, row, colStart + 1, stat.employeeCount);
      setNumber(sheet, row, colStart + 2, stat.payrollFund);
      if (quarterIndex === 0 && rowOffset === 0) {
        setNumber(sheet, row, 13, document.yearToDatePayrollFund);
      }
    }
  }

  const ytd = document.calculatedYtd;
  const settings = document.settings;
  setNumber(sheet, 17, 9, settings.openingDebtAgent25 ?? 0);
  setNumber(sheet, 17, 11, settings.openingDebtAgent1 ?? 0);
  setNumber(sheet, 18, 9, settings.openingDebtTaxpayer25 ?? 0);
  setNumber(sheet, 18, 11, settings.openingDebtTaxpayer1 ?? 0);
  setNumber(sheet, 19, 9, ytd.employer25);
  setNumber(sheet, 19, 11, ytd.employee1);
  setNumber(sheet, 24, 9, settings.recalculatedPlus25 ?? 0);
  setNumber(sheet, 24, 11, settings.recalculatedPlus1 ?? 0);
  setNumber(sheet, 25, 9, settings.recalculatedMinus25 ?? 0);
  setNumber(sheet, 25, 11, settings.recalculatedMinus1 ?? 0);
  setNumber(sheet, 26, 9, settings.penalty25 ?? 0);
  setNumber(sheet, 26, 11, settings.penalty1 ?? 0);
  setNumber(sheet, 27, 9, settings.interest25 ?? 0);
  setNumber(sheet, 27, 11, settings.interest1 ?? 0);
  setNumber(sheet, 28, 9, settings.excludedExpenses25 ?? 0);
  setNumber(sheet, 28, 11, settings.excludedExpenses1 ?? 0);
  setNumber(sheet, 29, 9, settings.transferredFromAdsin25 ?? 0);
  setNumber(sheet, 29, 11, settings.transferredFromAdsin1 ?? 0);
  setNumber(sheet, 30, 9, settings.listAmount25 ?? 0);
  setNumber(sheet, 30, 11, settings.listAmount1 ?? 0);

  const totalDue25 =
    (settings.openingDebtTaxpayer25 ?? 0) +
    ytd.employer25 +
    (settings.recalculatedPlus25 ?? 0) +
    (settings.recalculatedMinus25 ?? 0) +
    (settings.penalty25 ?? 0) +
    (settings.interest25 ?? 0) +
    (settings.excludedExpenses25 ?? 0) +
    (settings.transferredFromAdsin25 ?? 0) +
    (settings.listAmount25 ?? 0);
  const totalDue1 =
    (settings.openingDebtTaxpayer1 ?? 0) +
    ytd.employee1 +
    (settings.recalculatedPlus1 ?? 0) +
    (settings.recalculatedMinus1 ?? 0) +
    (settings.penalty1 ?? 0) +
    (settings.interest1 ?? 0) +
    (settings.excludedExpenses1 ?? 0) +
    (settings.transferredFromAdsin1 ?? 0) +
    (settings.listAmount1 ?? 0);
  setNumber(sheet, 31, 9, totalDue25);
  setNumber(sheet, 31, 11, totalDue1);
  setNumber(sheet, 32, 9, settings.paidYtd25 ?? quarterPaymentTotal25Percent(document));
  setNumber(sheet, 32, 11, settings.paidYtd1 ?? quarterPaymentTotal1Percent(document));
}

function buildZam2Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const sheet = workbook.addWorksheet('Зам2');
  appendixHeader(sheet, 2, 5);
  setCell(sheet, 6, 1, 'Маълумоти ҷамъбастии музди меҳнати пардохткардашуда');
  fillOrganizationBlock(sheet, document, 8, 3, 7, 1);
  setCell(sheet, 7, 1, 'РМС');
  setCell(sheet, 7, 2, document.rmsCode);
  setCell(sheet, 10, 3, document.quarter);
  setCell(sheet, 10, 5, document.year);
  setNumber(sheet, 12, 3, document.quarterPayrollFund);
  setNumber(sheet, 12, 5, document.calculatedQuarter.employer25);
  setNumber(sheet, 12, 7, document.calculatedQuarter.employee1);

  const monthCols = [4, 5, 6];
  let row = 15;
  for (const employeeRow of document.employeeRows) {
    setCell(sheet, row, 1, employeeRow.index);
    setCell(sheet, row, 2, employeeRow.ris);
    setCell(sheet, row, 3, employeeRow.fullName);
    document.quarterMonths.forEach((month, index) => {
      setNumber(sheet, row, monthCols[index], employeeRow.monthlyGross[month] ?? 0);
    });
    setNumber(sheet, row, 7, employeeRow.socialInsurance1Percent);
    row += 1;
  }
}

function buildZam3Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const sheet = workbook.addWorksheet('Зам3');
  appendixHeader(sheet, 3, 5);
  setCell(sheet, 6, 1, 'Маълумоти ҷамъбасти оиди кӯмакпулиҳои пардохтшуда');
  fillOrganizationBlock(sheet, document, 8, 3, 7, 1);
  setCell(sheet, 7, 1, 'РМС');
  setCell(sheet, 7, 2, document.rmsCode);
  setCell(sheet, 9, 3, document.quarter);
  setCell(sheet, 9, 5, document.year);

  const monthCols = [4, 5, 6];
  const categories: AdsinBenefitRow['category'][] = [
    'sick_temporary',
    'maternity_birth',
    'childcare_under_1_5',
    'funeral',
  ];
  let row = 13;

  for (const category of categories) {
    const label =
      category === 'sick_temporary'
        ? 'Кӯмакпули барои корношоямии мувақатӣ'
        : category === 'maternity_birth'
          ? 'Кӯмакпулӣ барои ҳомиладорӣ ва таваллуд'
          : category === 'childcare_under_1_5'
            ? 'Кӯмакпулӣ барои нигоҳубини кӯдаки то синни 1,5 сола'
            : 'Кӯмакпулӣ барои дафн';
    setCell(sheet, row, 2, label);
    row += 1;

    const categoryRows = document.benefitRows.filter((item) => item.category === category);
    let subtotalMonths: Record<string, number> = {};
    let subtotalTotal = 0;

    for (const benefitRow of categoryRows) {
      setCell(sheet, row, 1, benefitRow.index);
      setCell(sheet, row, 2, benefitRow.ris);
      setCell(sheet, row, 3, benefitRow.fullName);
      document.quarterMonths.forEach((month, index) => {
        const amount = benefitRow.monthlyAmounts[month] ?? 0;
        setNumber(sheet, row, monthCols[index], amount);
        subtotalMonths[month] = (subtotalMonths[month] ?? 0) + amount;
      });
      setNumber(sheet, row, 7, benefitRow.total);
      subtotalTotal += benefitRow.total;
      row += 1;
    }

    setCell(sheet, row, 2, 'Ҷамъ:');
    document.quarterMonths.forEach((month, index) => {
      setNumber(sheet, row, monthCols[index], subtotalMonths[month] ?? 0);
    });
    setNumber(sheet, row, 7, subtotalTotal);
    row += 2;
  }
}

function buildZam4Sheet(
  workbook: ExcelJS.Workbook,
  document: SocialInsuranceAgencyReportDocument
): void {
  const sheet = workbook.addWorksheet('зам4');
  appendixHeader(sheet, 4, 3);
  setCell(sheet, 7, 1, 'Маълумотнома оиди рафту омади кормандон');
  setCell(sheet, 8, 1, 'РМС');
  setCell(sheet, 8, 2, document.rmsCode);
  setCell(sheet, 8, 4, document.quarter);
  setCell(sheet, 8, 6, document.year);
  setCell(sheet, 10, 3, document.organizationName);

  const sections: Array<{ kind: AdsinStaffMovementRow['kind']; startRow: number }> = [
    { kind: 'dismissed', startRow: 14 },
    { kind: 'hired', startRow: 23 },
  ];

  for (const section of sections) {
    const items = document.staffMovements.filter((item) => item.kind === section.kind);
    let row = section.startRow;
    for (const movement of items) {
      setCell(sheet, row, 1, movement.index);
      setCell(sheet, row, 2, movement.ris);
      setCell(sheet, row, 3, movement.fullName);
      setCell(sheet, row, 5, movement.eventDate);
      setCell(sheet, row, 6, movement.reason);
      row += 1;
    }
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
  const sheet = workbook.addWorksheet(sheetName);
  appendixHeader(sheet, appendixNo, 3);
  setCell(sheet, 7, 1, `Маълумот оиди пардохти саҳмҳои суғуртавии ${rateLabel}`);
  setCell(sheet, 9, 1, 'РМС');
  setCell(sheet, 9, 2, document.rmsCode);
  setCell(sheet, 10, 3, document.organizationName);
  setCell(sheet, 12, 3, document.quarter);
  setCell(sheet, 12, 4, document.year);

  const monthCols = [3, 4, 5];
  document.quarterMonths.forEach((month, index) => {
    const monthIndex = Number.parseInt(month.slice(5, 7), 10) - 1;
    setCell(sheet, 15, monthCols[index], ADSIN_MONTH_LABELS_LOWER[monthIndex]);
  });

  let row = 16;
  const monthTotals = Object.fromEntries(document.quarterMonths.map((month) => [month, 0]));

  for (const record of records) {
    setCell(sheet, row, 1, record.paymentSlipNumber ?? '');
    setCell(sheet, row, 2, record.paymentDate ?? '');
    document.quarterMonths.forEach((month, index) => {
      const amount = record.monthAmounts?.[month] ?? 0;
      setNumber(sheet, row, monthCols[index], amount);
      monthTotals[month] += amount;
    });
    row += 1;
  }

  setCell(sheet, 31, 1, 'Ҷамъ:');
  document.quarterMonths.forEach((month, index) => {
    setNumber(sheet, 31, monthCols[index], monthTotals[month]);
  });
  const quarterTotal = Object.values(monthTotals).reduce((sum, value) => sum + value, 0);
  setNumber(sheet, 32, 3, quarterTotal);
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
