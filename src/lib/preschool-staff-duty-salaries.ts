import {
  calculateWageScale,
  DEFAULT_STUDENT_BRACKET,
  formatWageAmount,
  getDutySalaryFromScale,
  inferWageScaleFromPosition,
  parseWageAmount,
} from '@/lib/preschool-wage-scales';
import { isKindergartenOrganization } from '@/lib/organization-scope';
import { OrganizationSectionContent, SectionTable } from '@/types/organization-section';
import {
  detectStaffColumns,
  formatAmount,
  isTotalRow,
  parseAmount,
  parseStaffCount,
  recalculateAllStaffTables,
} from '@/lib/staff-table-calc';

/** Меъёрҳои маоши вазифавӣ — Қарори Ҳукумати ҶТ №113, 28.02.2025 (аз 01.09.2025) */
export const PRESCHOOL_WAGE_DECREE = 'Қарори Ҳукумати ҶТ №113, 28.02.2025';
export const PRESCHOOL_WAGE_EFFECTIVE = '01.09.2025';

export function lookupStaffTableDutySalary(
  tables: SectionTable[] | undefined,
  department: string,
  position: string
): number | null {
  if (!tables?.length || !department || !position) return null;

  for (const table of tables) {
    if (table.title !== department) continue;
    const columns = detectStaffColumns(table.columns);
    if (!columns) continue;

    for (const row of table.rows) {
      if (isTotalRow(row, columns.position)) continue;
      if (row[columns.position]?.trim() !== position.trim()) continue;
      return parseAmount(row[columns.baseSalary]);
    }
  }

  return null;
}

/** Маоши вазифавии як воҳиди корӣ барои вазифа (аз ҷадвали Қарори №113). */
export function getDutySalaryForPosition(
  position: string,
  organizationId?: string
): number | null {
  const inferred = inferWageScaleFromPosition(position, organizationId);
  if (!inferred.group) return null;
  return getDutySalaryFromScale(
    calculateWageScale({ ...inferred, extraDuties: [] }, organizationId),
    organizationId
  );
}

export function applyPreschoolDutySalaries(
  content: OrganizationSectionContent,
  organizationId?: string
): OrganizationSectionContent {
  if (!isKindergartenOrganization(organizationId)) {
    return content;
  }
  const tables = (content.tables ?? []).map((table) => {
    const columns = detectStaffColumns(table.columns);
    if (!columns || table.title.toLowerCase().includes('истинод')) {
      return table;
    }

    const rows = table.rows.map((row) => {
      if (isTotalRow(row, columns.position)) return row;
      const position = row[columns.position]?.trim();
      if (!position) return row;

      const duty = getDutySalaryForPosition(position, organizationId);
      if (duty === null) return row;

      const next = [...row];
      next[columns.baseSalary] = formatAmount(duty);
      if (columns.harmfulPercent >= 0) next[columns.harmfulPercent] = '';
      if (columns.harmfulAmount >= 0) next[columns.harmfulAmount] = '';
      return next;
    });

    return recalculateAllStaffTables([{ ...table, rows }])[0];
  });

  return {
    ...content,
    tables: recalculateAllStaffTables(tables),
  };
}

export function formatDutySalary(value: number): string {
  return formatWageAmount(value);
}

export function parseDutySalary(value?: string): number | null {
  return parseWageAmount(value);
}

export function getDefaultStudentBracketForEnrollees(count: number) {
  if (count <= 100) return 'upTo100' as const;
  if (count <= 280) return DEFAULT_STUDENT_BRACKET;
  if (count <= 400) return 'from281to400' as const;
  if (count <= 880) return 'from401to880' as const;
  if (count <= 1600) return 'from881to1600' as const;
  if (count <= 2500) return 'from1601to2500' as const;
  return 'over2500' as const;
}

export function summarizeStaffMonthlyFund(tables: SectionTable[] = []): number {
  let total = 0;
  for (const table of tables) {
    const columns = detectStaffColumns(table.columns);
    if (!columns || table.title.toLowerCase().includes('истинод')) continue;
    for (const row of table.rows) {
      if (isTotalRow(row, columns.position)) {
        total += parseStaffCount(row[columns.monthlyWage]) ?? 0;
      }
    }
  }
  return total;
}
