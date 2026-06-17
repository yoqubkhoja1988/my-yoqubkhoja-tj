import { downloadBlob } from '@/lib/document-export/download-blob';
import { EXCEL_COLORS, styleExcelCell } from '@/lib/document-export/excel-styles';
import {
  countWorkedDays,
  countWorkedHours,
  getDaysInMonth,
  resolveTimesheetMark,
} from '@/lib/staff-timesheet';
import { StaffEmployee, StaffTimesheet } from '@/types/organization-section';

export type TimesheetExportLabels = {
  title: string;
  month: string;
  normDays: string;
  no: string;
  employee: string;
  personnelNumber: string;
  totalDays: string;
  totalHours: string;
  legend: string;
};

export function timesheetExportFilename(month: string): string {
  return `tabel-${month}.xlsx`;
}

export async function downloadTimesheetExcel(options: {
  sheet: StaffTimesheet;
  employees: StaffEmployee[];
  month: string;
  monthLabel: string;
  normWorkingDays: number;
  labels: TimesheetExportLabels;
  legendLines: string[];
}) {
  const { sheet, employees, month, monthLabel, labels, legendLines } = options;
  const daysInMonth = getDaysInMonth(month);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'my-yoqubkhoja-tj';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Ҷадвали ҳузур', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
    },
    views: [{ state: 'frozen', ySplit: 5, xSplit: 3 }],
  });

  styleExcelCell(worksheet.getCell(1, 1), {
    value: labels.title,
    bold: true,
    size: 14,
    hAlign: 'center',
    wrap: true,
  });
  worksheet.mergeCells(1, 1, 1, 3 + daysInMonth + 2);

  styleExcelCell(worksheet.getCell(2, 1), {
    value: `${labels.month}: ${monthLabel}`,
    hAlign: 'center',
    wrap: true,
  });
  worksheet.mergeCells(2, 1, 2, 3 + daysInMonth + 2);

  styleExcelCell(worksheet.getCell(3, 1), {
    value: labels.normDays,
    hAlign: 'center',
    wrap: true,
  });
  worksheet.mergeCells(3, 1, 3, 3 + daysInMonth + 2);

  const headerRow = 5;
  const headers = [
    labels.no,
    labels.employee,
    labels.personnelNumber,
    ...dayNumbers.map(String),
    labels.totalDays,
    labels.totalHours,
  ];

  headers.forEach((label, index) => {
    styleExcelCell(worksheet.getCell(headerRow, index + 1), {
      value: label,
      bold: true,
      bg: EXCEL_COLORS.headerBlue,
      hAlign: 'center',
      wrap: true,
    });
  });
  worksheet.getRow(headerRow).height = 24;

  employees.forEach((employee, employeeIndex) => {
    const rowNumber = headerRow + 1 + employeeIndex;
    const entry = sheet.entries.find((item) => item.employeeId === employee.id);
    const rowValues: Array<string | number> = [
      employeeIndex + 1,
      employee.fullName,
      employee.personnelNumber || '—',
      ...dayNumbers.map((day) =>
        entry ? resolveTimesheetMark(entry, month, day) || '—' : '—'
      ),
      entry ? countWorkedDays(entry, month) : 0,
      entry ? countWorkedHours(entry, month) : 0,
    ];

    rowValues.forEach((value, columnIndex) => {
      styleExcelCell(worksheet.getCell(rowNumber, columnIndex + 1), {
        value,
        hAlign: columnIndex < 3 ? (columnIndex === 1 ? 'left' : 'center') : 'center',
        wrap: columnIndex === 1,
      });
    });
    worksheet.getRow(rowNumber).height = 20;
  });

  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 24;
  worksheet.getColumn(3).width = 10;
  for (let day = 1; day <= daysInMonth; day += 1) {
    worksheet.getColumn(3 + day).width = 4;
  }
  worksheet.getColumn(3 + daysInMonth + 1).width = 10;
  worksheet.getColumn(3 + daysInMonth + 2).width = 10;

  if (legendLines.length > 0) {
    const legendSheet = workbook.addWorksheet('Рамзҳо');
    styleExcelCell(legendSheet.getCell(1, 1), {
      value: labels.legend,
      bold: true,
      bg: EXCEL_COLORS.headerBlue,
    });
    legendLines.forEach((line, index) => {
      styleExcelCell(legendSheet.getCell(index + 2, 1), { value: line, wrap: true });
    });
    legendSheet.getColumn(1).width = 48;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    timesheetExportFilename(month)
  );
}
