import { extractStaffingOptions } from '@/lib/staff-staffing-options';
import { activeEmployees } from '@/lib/staff-timesheet';
import {
  OrganizationSectionContent,
  StaffEmployee,
} from '@/types/organization-section';

function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isAccountantEmployee(employee: StaffEmployee): boolean {
  if (employee.id.includes('accountant')) return true;
  if (employee.wageScale?.auxiliaryRole === 'accountant') return true;
  return /муҳосиб|сармуҳосиб|бухгалтер/i.test(employee.position ?? '');
}

export function resolveAccountantEmployee(
  staffContent: OrganizationSectionContent | null | undefined,
  chiefAccountantName?: string
): StaffEmployee | null {
  const employees = activeEmployees(staffContent?.employees);
  if (employees.length === 0) return null;

  const chiefNorm = chiefAccountantName ? normalizePersonName(chiefAccountantName) : '';
  if (chiefNorm) {
    const byName = employees.find(
      (employee) => normalizePersonName(employee.fullName) === chiefNorm
    );
    if (byName?.position?.trim()) return byName;
  }

  return employees.find(isAccountantEmployee) ?? null;
}

function findAccountantPositionInStaffingTables(
  staffContent: OrganizationSectionContent | null | undefined
): string | null {
  for (const department of extractStaffingOptions(staffContent?.tables)) {
    for (const position of department.positions) {
      if (/муҳосиб|сармуҳосиб|бухгалтер/i.test(position)) {
        return position.trim();
      }
    }
  }
  return null;
}

/** Навиштаҷоти имзои муҳосиб — аз басти вазифаҳо (вазифаи корманд ё ҷадвал). */
export function getAccountantSignatureLabel(
  staffContent: OrganizationSectionContent | null | undefined,
  options?: {
    chiefAccountantName?: string;
    fallback?: string;
  }
): string {
  const employee = resolveAccountantEmployee(staffContent, options?.chiefAccountantName);
  if (employee?.position?.trim()) {
    return employee.position.trim();
  }

  const fromTable = findAccountantPositionInStaffingTables(staffContent);
  if (fromTable) return fromTable;

  return options?.fallback ?? 'Сармуҳосиб';
}
