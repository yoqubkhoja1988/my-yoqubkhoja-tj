import type { EducationLevel } from '@/lib/preschool-wage-scales';
import { EmployeeSchoolingLevel } from '@/types/organization-section';

export const EMPLOYEE_SCHOOLING_LEVELS: EmployeeSchoolingLevel[] = [
  'general_secondary',
  'secondary_vocational',
  'higher',
];

export function schoolingMessageKey(level: EmployeeSchoolingLevel): string {
  return `employeeSchooling_${level}`;
}

export function parseEmployeeSchoolingLevel(value: string): EmployeeSchoolingLevel | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (
    normalized === 'secondary_vocational' ||
    normalized.includes('миёнаи касб') ||
    normalized.includes('профессиональн') ||
    normalized.includes('kasbiy') ||
    normalized.includes('vocational')
  ) {
    return 'secondary_vocational';
  }

  if (
    normalized === 'general_secondary' ||
    normalized.includes('миёнаи умум') ||
    normalized.includes('общее') ||
    normalized.includes('general secondary')
  ) {
    return 'general_secondary';
  }

  if (
    normalized === 'higher' ||
    normalized.includes('таҳсилоти ол') ||
    normalized.includes('олӣ') ||
    normalized.includes('высш') ||
    normalized.includes('higher')
  ) {
    return 'higher';
  }

  return undefined;
}

export function inferSchoolingFromWageEducationLevel(
  level?: EducationLevel
): EmployeeSchoolingLevel | undefined {
  if (!level) return undefined;
  if (level === 'general_secondary') return 'general_secondary';
  if (level.startsWith('secondary_vocational')) return 'secondary_vocational';
  return 'higher';
}
