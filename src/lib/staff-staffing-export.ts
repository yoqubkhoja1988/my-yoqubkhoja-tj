import { downloadBlob } from '@/lib/document-export/download-blob';
import { EXCEL_COLORS, styleExcelCell } from '@/lib/document-export/excel-styles';
import { detectStaffColumns } from '@/lib/staff-table-calc';
import { SectionTable } from '@/types/organization-section';

const DEPARTMENT_MARKER = '##DEPARTMENT:';
const CAPTION_MARKER = '##CAPTION:';

export function isStaffingTable(table: SectionTable): boolean {
  return detectStaffColumns(table.columns) !== null;
}

export function filterStaffingTables(tables: SectionTable[] = []): SectionTable[] {
  return tables.filter(isStaffingTable);
}

export function staffingExportFilename(ext: 'csv' | 'xlsx', date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return ext === 'csv' ? `staffing-${stamp}.csv` : `staffing-${stamp}.xlsx`;
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function sanitizeSheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const tail = ` ${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 31 - tail.length))}${tail}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function exportStaffingTablesToCsv(tables: SectionTable[]): string {
  const staffingTables = filterStaffingTables(tables);
  const blocks: string[] = [];

  for (const table of staffingTables) {
    blocks.push(DEPARTMENT_MARKER + table.title);
    blocks.push(CAPTION_MARKER + (table.caption ?? ''));
    blocks.push(table.columns.map(escapeCsvCell).join(';'));
    for (const row of table.rows) {
      const padded = [...row];
      while (padded.length < table.columns.length) padded.push('');
      blocks.push(
        padded
          .slice(0, table.columns.length)
          .map((cell) => escapeCsvCell(cell ?? ''))
          .join(';')
      );
    }
    blocks.push('');
  }

  return `\uFEFF${blocks.join('\n').trim()}`;
}

export async function downloadStaffingTablesExcel(
  tables: SectionTable[],
  filename: string,
  _workbookLabel = 'Басти вазифаҳо'
) {
  const staffingTables = filterStaffingTables(tables);
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'my-yoqubkhoja-tj';
  workbook.created = new Date();

  const usedNames = new Set<string>();

  for (const table of staffingTables) {
    const sheet = workbook.addWorksheet(sanitizeSheetName(table.title, usedNames));
    let rowIndex = 1;

    styleExcelCell(sheet.getCell(rowIndex, 1), {
      value: `${CAPTION_MARKER}${table.caption ?? ''}`,
      bold: true,
      wrap: true,
    });
    sheet.getRow(rowIndex).height = table.caption ? 24 : 18;
    rowIndex += 1;

    table.columns.forEach((column, columnIndex) => {
      styleExcelCell(sheet.getCell(rowIndex, columnIndex + 1), {
        value: column,
        bold: true,
        bg: EXCEL_COLORS.headerBlue,
        hAlign: 'center',
        wrap: true,
      });
    });
    sheet.getRow(rowIndex).height = 30;
    rowIndex += 1;

    table.rows.forEach((row) => {
      const padded = [...row];
      while (padded.length < table.columns.length) padded.push('');
      padded.slice(0, table.columns.length).forEach((cell, columnIndex) => {
        styleExcelCell(sheet.getCell(rowIndex, columnIndex + 1), {
          value: cell ?? '',
          wrap: true,
        });
      });
      sheet.getRow(rowIndex).height = 20;
      rowIndex += 1;
    });

    sheet.columns.forEach((column, index) => {
      let max = Math.max(10, table.columns[index]?.length ?? 10);
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > max) max = Math.min(len + 2, 48);
      });
      column.width = max;
    });

    sheet.views = [{ state: 'frozen', ySplit: 2 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  );
}

export function parseStaffingTablesFromCsv(content: string): SectionTable[] {
  const text = content.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  const tables: SectionTable[] = [];
  let current: SectionTable | null = null;
  let expectingHeader = false;

  function flushCurrent() {
    if (current && current.columns.length > 0) {
      tables.push(current);
    }
    current = null;
    expectingHeader = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith(DEPARTMENT_MARKER)) {
      flushCurrent();
      current = {
        title: line.slice(DEPARTMENT_MARKER.length).trim() || 'Бахши нав',
        columns: [],
        rows: [],
      };
      expectingHeader = false;
      continue;
    }

    if (!current) continue;

    if (line.startsWith(CAPTION_MARKER)) {
      current.caption = line.slice(CAPTION_MARKER.length).trim() || undefined;
      expectingHeader = true;
      continue;
    }

    const delimiter = line.includes(';') ? ';' : ',';
    const cells = parseCsvLine(line, delimiter);

    if (current.columns.length === 0 || expectingHeader) {
      current.columns = cells;
      expectingHeader = false;
      continue;
    }

    current.rows.push(cells);
  }

  flushCurrent();
  return tables.filter(isStaffingTable);
}

function excelCellToString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();
    }
    if ('result' in value) return excelCellToString(value.result);
  }
  return String(value).trim();
}

export async function parseStaffingTablesFromExcel(buffer: ArrayBuffer): Promise<SectionTable[]> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const tables: SectionTable[] = [];

  workbook.worksheets.forEach((sheet) => {
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        values[colNumber - 1] = excelCellToString(cell.value);
      });
      while (values.length > 0 && !values[values.length - 1]) values.pop();
      if (values.some((value) => value.trim())) rows.push(values);
    });

    if (rows.length < 2) return;

    let caption: string | undefined;
    let headerRowIndex = 0;
    const firstCell = rows[0][0] ?? '';
    if (firstCell.startsWith(CAPTION_MARKER)) {
      caption = firstCell.slice(CAPTION_MARKER.length).trim() || undefined;
      headerRowIndex = 1;
    }

    const columns = rows[headerRowIndex] ?? [];
    const dataRows = rows.slice(headerRowIndex + 1);
    if (columns.length === 0) return;

    const table: SectionTable = {
      title: sheet.name.trim() || 'Бахши нав',
      caption,
      columns,
      rows: dataRows.map((row) => {
        const padded = [...row];
        while (padded.length < columns.length) padded.push('');
        return padded.slice(0, columns.length);
      }),
    };

    if (isStaffingTable(table)) tables.push(table);
  });

  return tables;
}

export function isStaffingImportFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || name.endsWith('.xlsx');
}
