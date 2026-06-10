import {
  detectStaffColumns,
  isTotalRow,
  parseAmount,
  parseStaffCount,
} from '@/lib/staff-table-calc';
import { OrganizationSectionContent } from '@/types/organization-section';

export type StaffingSlot = {
  department: string;
  position: string;
  quota: number;
  filled: number;
  vacant: number;
  overfilled: number;
  baseSalary?: string;
  monthlyWage?: string;
  harmfulPercent?: string;
};

export type StaffAnalytics = {
  totalQuota: number;
  totalRegistered: number;
  totalActive: number;
  totalVacant: number;
  totalOverfilled: number;
  monthlyFund: string | null;
  slots: StaffingSlot[];
};

export function analyzeStaffing(content: OrganizationSectionContent): StaffAnalytics {
  const employees = content.employees ?? [];
  const tables = content.tables ?? [];
  const slots: StaffingSlot[] = [];

  for (const table of tables) {
    const titleLower = table.title.toLowerCase();
    if (titleLower.includes('ҳамагӣ')) continue;

    const columns = detectStaffColumns(table.columns);
    if (!columns) continue;

    for (const row of table.rows) {
      if (isTotalRow(row, columns.position)) continue;

      const position = row[columns.position]?.trim();
      if (!position) continue;

      const quota = parseStaffCount(row[columns.staff]) ?? 0;
      const filled = employees.filter(
        (employee) =>
          employee.department === table.title &&
          employee.position === position &&
          employee.status !== 'inactive'
      ).length;

      slots.push({
        department: table.title,
        position,
        quota,
        filled,
        vacant: Math.max(0, quota - filled),
        overfilled: Math.max(0, filled - quota),
        baseSalary: row[columns.baseSalary]?.trim() || undefined,
        monthlyWage: row[columns.monthlyWage]?.trim() || undefined,
        harmfulPercent:
          columns.harmfulPercent >= 0
            ? row[columns.harmfulPercent]?.trim() || undefined
            : undefined,
      });
    }
  }

  const activeEmployees = employees.filter((employee) => employee.status !== 'inactive');
  const totalQuota = slots.reduce((sum, slot) => sum + slot.quota, 0);
  const totalVacant = slots.reduce((sum, slot) => sum + slot.vacant, 0);
  const totalOverfilled = slots.reduce((sum, slot) => sum + slot.overfilled, 0);

  let monthlyFund: string | null = null;
  const grandTables = tables.filter((table) => table.title.toLowerCase().includes('ҳамагӣ'));
  if (grandTables.length > 0) {
    let fundSum = 0;
    for (const table of grandTables) {
      const lower = table.columns.map((column) => column.toLowerCase());
      const monthlyIndex = lower.findIndex(
        (column) => column.includes('музди') && column.includes('моҳона')
      );
      if (monthlyIndex >= 0) {
        for (const row of table.rows) {
          fundSum += parseAmount(row[monthlyIndex]) ?? 0;
        }
      }
    }
    if (fundSum > 0) {
      const [intPart, decPart] = fundSum.toFixed(2).split('.');
      monthlyFund = `${intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${decPart}`;
    }
  }

  return {
    totalQuota,
    totalRegistered: employees.length,
    totalActive: activeEmployees.length,
    totalVacant,
    totalOverfilled,
    monthlyFund,
    slots,
  };
}
