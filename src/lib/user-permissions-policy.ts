import { ALL_SECTION_SLUGS } from '@/lib/activity-directions';
import { FINANCIAL_REPORT_SECTION_SLUGS } from '@/lib/financial-reports-menu';
import {
  DEFAULT_USER_PERMISSIONS,
  UserPermissions,
  normalizeUserPermissions,
} from '@/types/user';

/** Бахшҳои одатӣ барои корбари муҳосиб (танҳо молия, кадрҳо, ҳисоботҳо). */
export const ACCOUNTANT_SECTION_SLUGS = [
  'overview',
  'org-info',
  'finance',
  'staff',
  'formation-report',
  ...FINANCIAL_REPORT_SECTION_SLUGS,
] as const;

export function finalizeUserPermissions(permissions: UserPermissions): UserPermissions {
  const normalized = normalizeUserPermissions(permissions);
  const sectionSlugs = [...new Set(normalized.sectionSlugs)];

  return {
    canAccessProjects: normalized.canAccessProjects,
    supervisionOnly: normalized.supervisionOnly === true,
    organizationIds: [...new Set(normalized.organizationIds)],
    sectionSlugs,
  };
}

export function isInflatedSectionAccess(permissions: UserPermissions): boolean {
  if (permissions.supervisionOnly) return false;
  const unique = new Set(permissions.sectionSlugs);
  return unique.size >= ALL_SECTION_SLUGS.length - 3;
}

export function getAccountantPresetPermissions(
  base: Pick<UserPermissions, 'canAccessProjects' | 'organizationIds'>
): UserPermissions {
  return finalizeUserPermissions({
    ...DEFAULT_USER_PERMISSIONS,
    ...base,
    supervisionOnly: false,
    sectionSlugs: [...ACCOUNTANT_SECTION_SLUGS],
  });
}
