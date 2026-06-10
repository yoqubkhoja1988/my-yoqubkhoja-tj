import { StaffEmployee } from '@/types/organization-section';

function parsePersonnelNumber(value?: string): number | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMaxPersonnelNumber(employees: StaffEmployee[]): number {
  let max = 0;

  for (const employee of employees) {
    const parsed = parsePersonnelNumber(employee.personnelNumber);
    if (parsed !== null && parsed > max) {
      max = parsed;
    }
  }

  return max;
}

function formatPersonnelNumber(value: number): string {
  return String(value).padStart(6, '0');
}

export function generateNextPersonnelNumber(employees: StaffEmployee[]): string {
  return formatPersonnelNumber(getMaxPersonnelNumber(employees) + 1);
}

export function assignMissingPersonnelNumbers(employees: StaffEmployee[]): StaffEmployee[] {
  let next = getMaxPersonnelNumber(employees);

  return employees.map((employee) => {
    if (employee.personnelNumber?.trim()) return employee;
    next += 1;
    return { ...employee, personnelNumber: formatPersonnelNumber(next) };
  });
}

export function hasMissingPersonnelNumbers(employees: StaffEmployee[]): boolean {
  return employees.some((employee) => !employee.personnelNumber?.trim());
}
