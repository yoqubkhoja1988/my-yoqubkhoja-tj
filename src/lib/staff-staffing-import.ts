import { recalculateAllStaffTables } from '@/lib/staff-table-calc';
import { filterStaffingTables, isStaffingTable } from '@/lib/staff-staffing-export';
import { SectionTable } from '@/types/organization-section';

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function isGrandTotalTable(table: SectionTable): boolean {
  return table.title.toLowerCase().includes('ҳамагӣ');
}

export type StaffingImportMergeResult = {
  tables: SectionTable[];
  added: number;
  updated: number;
};

export function mergeStaffingTables(
  existing: SectionTable[] = [],
  imported: SectionTable[] = []
): StaffingImportMergeResult {
  const importedStaffing = filterStaffingTables(imported);
  const preserved = existing.filter((table) => !isStaffingTable(table) || isGrandTotalTable(table));
  const existingStaffing = existing.filter(
    (table) => isStaffingTable(table) && !isGrandTotalTable(table)
  );

  const merged = new Map<string, SectionTable>();
  const order: string[] = [];

  for (const table of existingStaffing) {
    const key = normalizeTitle(table.title);
    if (!merged.has(key)) order.push(key);
    merged.set(key, table);
  }

  let added = 0;
  let updated = 0;

  for (const table of importedStaffing) {
    const key = normalizeTitle(table.title);
    if (merged.has(key)) {
      updated += 1;
    } else {
      added += 1;
      order.push(key);
    }
    merged.set(key, table);
  }

  const staffingTables = order.map((key) => merged.get(key)!);
  const tables = recalculateAllStaffTables([...staffingTables, ...preserved]);

  return { tables, added, updated };
}
