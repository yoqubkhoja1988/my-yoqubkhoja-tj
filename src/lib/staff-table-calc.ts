import { SectionTable } from '@/types/organization-section';

export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseStaffCount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatAmount(value: number): string {
  const [intPart, decPart] = value.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped},${decPart}`;
}

export function formatStaffCount(value: number): string {
  const safe = Math.max(0, value);
  if (Number.isInteger(safe)) return String(safe);
  return safe
    .toFixed(2)
    .replace('.', ',')
    .replace(/,?0+$/, '')
    .replace(/,$/, '');
}

export type StaffColumnMap = {
  position: number;
  staff: number;
  baseSalary: number;
  harmfulPercent: number;
  harmfulAmount: number;
  nightAllowance: number;
  monthlyWage: number;
};

export function detectStaffColumns(columns: string[]): StaffColumnMap | null {
  const lower = columns.map((column) => column.toLowerCase());
  const position = lower.findIndex(
    (column) =>
      column.includes('вазифа') &&
      !column.includes('маош') &&
      !column.includes('вазифав')
  );
  const staff = lower.findIndex(
    (column) =>
      column.includes('штат') || column.includes('воҳид') || column.includes('шумора')
  );
  const baseSalary = lower.findIndex((column) => column.includes('маоши вазифав'));
  const harmfulPercent = lower.findIndex(
    (column) => column.includes('зарарнок') && column.includes('%')
  );
  const harmfulAmount = lower.findIndex(
    (column) =>
      column.includes('зарарнок') &&
      (column.includes('иловапул') || column.includes('корҳои')) &&
      !column.includes('%')
  );
  const monthlyWage = lower.findIndex(
    (column) => column.includes('музди') && column.includes('моҳона')
  );
  const nightAllowance = lower.findIndex(
    (column) => column.includes('ронандагӣ') || column.includes('шабона')
  );

  if (position === -1 || staff === -1 || baseSalary === -1 || monthlyWage === -1) {
    return null;
  }

  return {
    position,
    staff,
    baseSalary,
    harmfulPercent,
    harmfulAmount,
    nightAllowance,
    monthlyWage,
  };
}

export function isTotalRow(row: string[], positionCol: number): boolean {
  const label = row[positionCol]?.trim().toLowerCase() ?? '';
  return label.includes('ҷамъ') || label.includes('ҳамагӣ');
}

function recalculateDataRow(row: string[], columns: StaffColumnMap): string[] {
  const next = [...row];
  if (isTotalRow(row, columns.position)) return next;

  const units = parseStaffCount(row[columns.staff]) ?? 0;
  next[columns.staff] = formatStaffCount(units);

  const baseSalary = parseAmount(row[columns.baseSalary]);
  if (baseSalary === null) return next;

  let harmfulAmount = 0;
  if (columns.harmfulAmount >= 0) {
    if (columns.harmfulPercent >= 0) {
      const percent = parseAmount(row[columns.harmfulPercent]);
      if (percent !== null && percent > 0) {
        harmfulAmount = baseSalary * (percent / 100);
        next[columns.harmfulAmount] = formatAmount(harmfulAmount);
      } else {
        harmfulAmount = parseAmount(row[columns.harmfulAmount]) ?? 0;
      }
    } else {
      harmfulAmount = parseAmount(row[columns.harmfulAmount]) ?? 0;
    }
  }

  const nightAllowance =
    columns.nightAllowance >= 0
      ? (parseAmount(row[columns.nightAllowance]) ?? 0)
      : 0;

  const wagePerUnit = baseSalary + harmfulAmount + nightAllowance;
  const monthlyWage = wagePerUnit * units;
  next[columns.monthlyWage] = formatAmount(monthlyWage);

  return next;
}

function recalculateTotalRow(
  rows: string[][],
  columns: StaffColumnMap,
  totalRowIndex: number
): string[] {
  const dataRows = rows.filter(
    (row, index) => index !== totalRowIndex && !isTotalRow(row, columns.position)
  );
  const totalRow = [...rows[totalRowIndex]];

  const staffSum = dataRows.reduce(
    (sum, row) => sum + (parseStaffCount(row[columns.staff]) ?? 0),
    0
  );
  const baseSum = dataRows.reduce(
    (sum, row) => sum + (parseAmount(row[columns.baseSalary]) ?? 0),
    0
  );
  const harmfulSum =
    columns.harmfulAmount >= 0
      ? dataRows.reduce(
          (sum, row) => sum + (parseAmount(row[columns.harmfulAmount]) ?? 0),
          0
        )
      : 0;
  const nightSum =
    columns.nightAllowance >= 0
      ? dataRows.reduce(
          (sum, row) => sum + (parseAmount(row[columns.nightAllowance]) ?? 0),
          0
        )
      : 0;
  const monthlySum = dataRows.reduce(
    (sum, row) => sum + (parseAmount(row[columns.monthlyWage]) ?? 0),
    0
  );

  totalRow[columns.staff] = formatStaffCount(staffSum);
  totalRow[columns.baseSalary] = formatAmount(baseSum);
  if (columns.harmfulPercent >= 0) totalRow[columns.harmfulPercent] = '';
  if (columns.harmfulAmount >= 0) totalRow[columns.harmfulAmount] = formatAmount(harmfulSum);
  if (columns.nightAllowance >= 0) totalRow[columns.nightAllowance] = formatAmount(nightSum);
  totalRow[columns.monthlyWage] = formatAmount(monthlySum);

  return totalRow;
}

export function recalculateStaffTable(table: SectionTable): SectionTable {
  const columns = detectStaffColumns(table.columns);
  if (!columns) return table;

  const totalRowIndex = table.rows.findIndex((row) => isTotalRow(row, columns.position));
  const recalculatedRows = table.rows.map((row, rowIndex) => {
    if (rowIndex === totalRowIndex) return row;
    return recalculateDataRow(row, columns);
  });

  if (totalRowIndex >= 0) {
    recalculatedRows[totalRowIndex] = recalculateTotalRow(
      recalculatedRows,
      columns,
      totalRowIndex
    );
  }

  return { ...table, rows: recalculatedRows };
}

function copyGrandTotalRow(
  targetTable: SectionTable,
  sourceRow: string[],
  sourceColumns: StaffColumnMap
): SectionTable {
  const lower = targetTable.columns.map((column) => column.toLowerCase());
  const targetStaff = lower.findIndex(
    (column) =>
      column.includes('штат') || column.includes('воҳид') || column.includes('шумора')
  );
  const targetBase = lower.findIndex((column) => column.includes('маоши вазифав'));
  const targetHarmful = lower.findIndex((column) => column.includes('зарарнок'));
  const targetNight = lower.findIndex(
    (column) => column.includes('ронандагӣ') || column.includes('шабона')
  );
  const targetIrregular = lower.findIndex((column) => column.includes('ғайримеъёр'));
  const targetAltitude = lower.findIndex((column) => column.includes('баландкӯҳ'));
  const targetMonthly = lower.findIndex(
    (column) => column.includes('музди') && column.includes('моҳона')
  );

  const nextRow = [...(targetTable.rows[0] ?? [])];
  if (targetStaff >= 0) nextRow[targetStaff] = sourceRow[sourceColumns.staff];
  if (targetBase >= 0) nextRow[targetBase] = sourceRow[sourceColumns.baseSalary];
  if (targetHarmful >= 0 && sourceColumns.harmfulAmount >= 0) {
    nextRow[targetHarmful] = sourceRow[sourceColumns.harmfulAmount];
  }
  if (targetNight >= 0 && sourceColumns.nightAllowance >= 0) {
    nextRow[targetNight] = sourceRow[sourceColumns.nightAllowance];
  }
  if (targetIrregular >= 0) nextRow[targetIrregular] = '0';
  if (targetAltitude >= 0) nextRow[targetAltitude] = '0';
  if (targetMonthly >= 0) nextRow[targetMonthly] = sourceRow[sourceColumns.monthlyWage];

  return { ...targetTable, rows: [nextRow] };
}

function aggregateGrandTotal(
  targetTable: SectionTable,
  sourceTables: SectionTable[]
): SectionTable {
  const totals = sourceTables
    .map((table) => {
      const columns = detectStaffColumns(table.columns);
      if (!columns) return null;
      const row = table.rows.find((item) => isTotalRow(item, columns.position));
      return row ? { row, columns } : null;
    })
    .filter((item): item is { row: string[]; columns: StaffColumnMap } => item !== null);

  if (totals.length === 0) return targetTable;

  const lower = targetTable.columns.map((column) => column.toLowerCase());
  const targetStaff = lower.findIndex(
    (column) =>
      column.includes('штат') || column.includes('воҳид') || column.includes('шумора')
  );
  const targetBase = lower.findIndex((column) => column.includes('маоши вазифав'));
  const targetHarmful = lower.findIndex((column) => column.includes('зарарнок'));
  const targetIrregular = lower.findIndex((column) => column.includes('ғайримеъёр'));
  const targetAltitude = lower.findIndex((column) => column.includes('баландкӯҳ'));
  const targetMonthly = lower.findIndex(
    (column) => column.includes('музди') && column.includes('моҳона')
  );

  let staffSum = 0;
  let baseSum = 0;
  let harmfulSum = 0;
  let monthlySum = 0;

  for (const { row, columns } of totals) {
    staffSum += parseStaffCount(row[columns.staff]) ?? 0;
    baseSum += parseAmount(row[columns.baseSalary]) ?? 0;
    if (columns.harmfulAmount >= 0) {
      harmfulSum += parseAmount(row[columns.harmfulAmount]) ?? 0;
    }
    monthlySum += parseAmount(row[columns.monthlyWage]) ?? 0;
  }

  const nextRow = [...(targetTable.rows[0] ?? [])];
  if (targetStaff >= 0) nextRow[targetStaff] = formatStaffCount(staffSum);
  if (targetBase >= 0) nextRow[targetBase] = formatAmount(baseSum);
  if (targetHarmful >= 0) nextRow[targetHarmful] = formatAmount(harmfulSum);
  if (targetIrregular >= 0) nextRow[targetIrregular] = '0';
  if (targetAltitude >= 0) nextRow[targetAltitude] = '0';
  if (targetMonthly >= 0) nextRow[targetMonthly] = formatAmount(monthlySum);

  return { ...targetTable, rows: [nextRow] };
}

export function recalculateAllStaffTables(tables: SectionTable[]): SectionTable[] {
  const recalculated = tables.map((table) => {
    if (table.title.toLowerCase().includes('ҳамагӣ')) return table;
    return detectStaffColumns(table.columns) ? recalculateStaffTable(table) : table;
  });

  return recalculated.map((table) => {
    const title = table.title.toLowerCase();
    if (!title.includes('ҳамагӣ')) {
      return table;
    }

    if (title.includes('хизматрасон')) {
      const serviceTable = recalculated.find(
        (item) =>
          item.title.toLowerCase().includes('хизматрасон') &&
          detectStaffColumns(item.columns) &&
          !item.title.toLowerCase().includes('ҳамагӣ')
      );
      if (!serviceTable) return table;

      const columns = detectStaffColumns(serviceTable.columns);
      const totalRow = columns
        ? serviceTable.rows.find((row) => isTotalRow(row, columns.position))
        : null;
      if (!columns || !totalRow) return table;

      return copyGrandTotalRow(table, totalRow, columns);
    }

    const sectionTables = recalculated.filter((item) => {
      const itemTitle = item.title.toLowerCase();
      return (
        detectStaffColumns(item.columns) &&
        !itemTitle.includes('хизматрасон') &&
        !itemTitle.includes('ҳамагӣ')
      );
    });

    return aggregateGrandTotal(table, sectionTables);
  });
}

export function isAutoCalculatedCell(columns: string[], cellIndex: number): boolean {
  const map = detectStaffColumns(columns);
  if (!map) return false;
  return cellIndex === map.harmfulAmount || cellIndex === map.monthlyWage;
}

export function isStaffCell(columns: string[], cellIndex: number): boolean {
  const map = detectStaffColumns(columns);
  if (!map) return false;
  return cellIndex === map.staff;
}
