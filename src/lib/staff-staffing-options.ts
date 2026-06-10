import { SectionTable } from '@/types/organization-section';
import { detectStaffColumns, isTotalRow } from '@/lib/staff-table-calc';

export type StaffingDepartment = {
  label: string;
  positions: string[];
};

export function extractStaffingOptions(tables: SectionTable[] = []): StaffingDepartment[] {
  const departments: StaffingDepartment[] = [];

  for (const table of tables) {
    const titleLower = table.title.toLowerCase();
    if (titleLower.includes('ҳамагӣ')) continue;

    const columns = detectStaffColumns(table.columns);
    if (!columns) continue;

    const positions = [
      ...new Set(
        table.rows
          .filter((row) => !isTotalRow(row, columns.position))
          .map((row) => row[columns.position]?.trim())
          .filter((value): value is string => Boolean(value))
      ),
    ];

    if (positions.length === 0) continue;

    departments.push({ label: table.title, positions });
  }

  return departments;
}

export function getPositionsForDepartment(
  departments: StaffingDepartment[],
  departmentLabel: string
): string[] {
  return departments.find((item) => item.label === departmentLabel)?.positions ?? [];
}
