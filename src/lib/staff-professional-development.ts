import { isKindergartenOrganization } from '@/lib/organization-scope';
import {
  EmployeeProfessionalCycleRecord,
  EmployeeProfessionalDevelopment,
  ProfessionalCycleKind,
} from '@/types/organization-section';

export const SPECIALIZATION_CYCLE_YEARS = 3;
export const QUALIFICATION_UPGRADE_CYCLE_YEARS = 2;

export type ProfessionalCycleStatus = 'missing' | 'valid' | 'due_soon' | 'overdue';

const DUE_SOON_DAYS = 90;

export function usesEducationProfessionalDevelopment(organizationId?: string): boolean {
  return isKindergartenOrganization(organizationId);
}

export function professionalCycleYears(kind: ProfessionalCycleKind): number {
  return kind === 'specialization' ? SPECIALIZATION_CYCLE_YEARS : QUALIFICATION_UPGRADE_CYCLE_YEARS;
}

export function emptyProfessionalDevelopment(): EmployeeProfessionalDevelopment {
  return {};
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addYearsToIsoDate(isoDate: string, years: number): string | null {
  const date = parseIsoDate(isoDate);
  if (!date) return null;
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return formatIsoDate(next);
}

export function getProfessionalCycleRecord(
  development: EmployeeProfessionalDevelopment | undefined,
  kind: ProfessionalCycleKind
): EmployeeProfessionalCycleRecord | undefined {
  if (!development) return undefined;
  return kind === 'specialization'
    ? development.specializationCycle
    : development.qualificationUpgradeCycle;
}

export function nextProfessionalCycleDueDate(
  lastCompletedAt: string | undefined,
  kind: ProfessionalCycleKind
): string | null {
  if (!lastCompletedAt?.trim()) return null;
  return addYearsToIsoDate(lastCompletedAt, professionalCycleYears(kind));
}

export function resolveProfessionalCycleStatus(
  lastCompletedAt: string | undefined,
  kind: ProfessionalCycleKind,
  today = new Date()
): ProfessionalCycleStatus {
  if (!lastCompletedAt?.trim()) return 'missing';

  const dueIso = nextProfessionalCycleDueDate(lastCompletedAt, kind);
  if (!dueIso) return 'missing';

  const dueDate = parseIsoDate(dueIso);
  if (!dueDate) return 'missing';

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const daysUntil = Math.round((dueStart.getTime() - todayStart.getTime()) / 86_400_000);

  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= DUE_SOON_DAYS) return 'due_soon';
  return 'valid';
}

function trimCycleRecord(
  record?: EmployeeProfessionalCycleRecord
): EmployeeProfessionalCycleRecord | undefined {
  if (!record) return undefined;

  const lastCompletedAt = record.lastCompletedAt?.trim();
  const certificateNo = record.certificateNo?.trim();
  const provider = record.provider?.trim();
  const notes = record.notes?.trim();

  if (!lastCompletedAt && !certificateNo && !provider && !notes) return undefined;

  return {
    ...(lastCompletedAt ? { lastCompletedAt } : {}),
    ...(certificateNo ? { certificateNo } : {}),
    ...(provider ? { provider } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function normalizeProfessionalDevelopment(
  development?: EmployeeProfessionalDevelopment
): EmployeeProfessionalDevelopment | undefined {
  if (!development) return undefined;

  const specializationCycle = trimCycleRecord(development.specializationCycle);
  const qualificationUpgradeCycle = trimCycleRecord(development.qualificationUpgradeCycle);

  if (!specializationCycle && !qualificationUpgradeCycle) return undefined;

  return {
    ...(specializationCycle ? { specializationCycle } : {}),
    ...(qualificationUpgradeCycle ? { qualificationUpgradeCycle } : {}),
  };
}
