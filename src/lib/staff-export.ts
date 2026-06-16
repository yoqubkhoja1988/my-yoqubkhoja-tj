import { downloadBlob } from '@/lib/document-export/download-blob';
import { EXCEL_COLORS, styleExcelCell } from '@/lib/document-export/excel-styles';

export type ExportColumn<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
};

const EXCEL_TEXT_COLUMNS = new Set([
  'personnelNumber',
  'ris',
  'rma',
  'phone',
  'bankAccount',
  'birthYear',
]);

export function employeeExportFilename(ext: 'csv' | 'xlsx', date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return ext === 'csv' ? `employees-${stamp}.csv` : `employees-${stamp}.xlsx`;
}

export function exportEmployeesToCsv<T extends Record<string, unknown>>(
  employees: T[],
  columns: ExportColumn<T>[]
): string {
  const header = columns.map((column) => `"${column.label.replace(/"/g, '""')}"`).join(';');
  const rows = employees.map((employee, index) =>
    columns
      .map((column) => {
        let value = '';
        if (column.key === 'index') value = String(index + 1);
        else value = String(employee[column.key] ?? '');
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(';')
  );

  return `\uFEFF${[header, ...rows].join('\n')}`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export async function downloadEmployeesExcel<T extends Record<string, unknown>>(
  employees: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = 'Кормандон'
) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'my-yoqubkhoja-tj';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

  columns.forEach((column, index) => {
    styleExcelCell(sheet.getCell(1, index + 1), {
      value: column.label,
      bold: true,
      bg: EXCEL_COLORS.headerBlue,
      hAlign: 'center',
      wrap: true,
    });
  });
  sheet.getRow(1).height = 30;

  employees.forEach((employee, rowIndex) => {
    const rowNumber = rowIndex + 2;
    columns.forEach((column, columnIndex) => {
      const cell = sheet.getCell(rowNumber, columnIndex + 1);
      const value =
        column.key === 'index' ? rowIndex + 1 : String(employee[column.key] ?? '');
      styleExcelCell(cell, {
        value,
        hAlign: column.key === 'index' ? 'center' : 'left',
        wrap: true,
      });
      if (EXCEL_TEXT_COLUMNS.has(String(column.key))) {
        cell.numFmt = '@';
      }
    });
    sheet.getRow(rowNumber).height = 20;
  });

  sheet.columns.forEach((column, index) => {
    let max = Math.max(10, columns[index]?.label.length ?? 10);
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = Math.min(len + 2, 48);
    });
    column.width = max;
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  );
}
