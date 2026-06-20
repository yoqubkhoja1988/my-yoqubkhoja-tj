import { Session } from 'next-auth';
import { ALL_SECTION_SLUGS } from '@/lib/activity-directions';
import { isSiteAdmin } from '@/lib/is-admin';
import { UserPermissions } from '@/types/user';
import { Organization } from '@/types/organization';
import { ActivityDirection } from '@/types/activity-direction';
import { isFinancialReportSection, FINANCIAL_REPORT_SECTION_SLUGS } from '@/lib/financial-reports-menu';
import { ORG_INFO_SECTION_SLUG } from '@/lib/organization-info';
import { ORGANIZATION_CONTRACTS_SECTION_SLUG } from '@/lib/org-service-contracts';
import { LEGAL_SECTION_SLUGS } from '@/lib/official-legal-catalog';

export const LIST_OF_ENTERPRISES_SECTION_SLUG = 'list-of-enterprises';

/** Бахшҳои гурӯҳи «Оиннома ва ҳуҷҷатҳои ҳуқуқӣ» */
export const CHARTER_LEGAL_SECTION_SLUGS = [
  'charter',
  'legal',
  LEGAL_SECTION_SLUGS.laws,
  LEGAL_SECTION_SLUGS.decisions,
  LEGAL_SECTION_SLUGS.documents,
] as const;

function hasOrganizationAccess(session: Session | null | undefined): boolean {
  if (!session?.user || isSiteAdmin(session)) return false;
  return (session.user.permissions?.organizationIds.length ?? 0) > 0;
}

export function isOrganizationManager(session: Session | null | undefined): boolean {
  if (!session?.user || isSiteAdmin(session)) return false;
  return session.user.permissions?.organizationManager === true;
}

function getGrantedSectionSlugs(session: Session | null | undefined): Set<string> {
  const permissions = session?.user?.permissions;
  if (!permissions) return new Set();

  if (
    (permissions.organizationManager || permissions.supervisionOnly) &&
    permissions.organizationIds.length > 0
  ) {
    return new Set(ALL_SECTION_SLUGS);
  }

  const slugs = new Set(permissions.sectionSlugs);
  if (permissions.organizationIds.length > 0) {
    slugs.add('overview');
  }
  return slugs;
}

export function getSessionPermissions(session: Session | null | undefined): UserPermissions | null {
  if (!session?.user || isSiteAdmin(session)) return null;
  return session.user.permissions ?? null;
}

export function isSupervisionOnlyUser(session: Session | null | undefined): boolean {
  if (!session?.user || isSiteAdmin(session)) return false;
  return session.user.permissions?.supervisionOnly === true;
}

export function canEditOrganizationContent(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  if (isSiteAdmin(session)) return true;
  if (isSupervisionOnlyUser(session)) return false;
  return false;
}

export function isCharterLegalSection(sectionSlug: string): boolean {
  return (CHARTER_LEGAL_SECTION_SLUGS as readonly string[]).includes(sectionSlug);
}

/** Бахшҳои таҳриршаванда барои корбари ташкилот */
export const ORG_USER_EDITABLE_SECTIONS = [
  ...CHARTER_LEGAL_SECTION_SLUGS,
  ORG_INFO_SECTION_SLUG,
  LIST_OF_ENTERPRISES_SECTION_SLUG,
  ORGANIZATION_CONTRACTS_SECTION_SLUG,
  'finance',
  'staff',
  'formation-report',
  ...FINANCIAL_REPORT_SECTION_SLUGS,
] as const;

export function isOrgUserEditableSection(sectionSlug: string): boolean {
  if (isCharterLegalSection(sectionSlug)) return true;
  if (sectionSlug === ORG_INFO_SECTION_SLUG) return true;
  if (sectionSlug === LIST_OF_ENTERPRISES_SECTION_SLUG) return true;
  if (sectionSlug === ORGANIZATION_CONTRACTS_SECTION_SLUG) return true;
  if (
    sectionSlug === 'finance' ||
    sectionSlug === 'staff' ||
    sectionSlug === 'formation-report'
  ) {
    return true;
  }
  return isFinancialReportSection(sectionSlug);
}

/** Таҳрири мундариҷа — барои корбари ташкилот бо дастрасӣ ба бахш */
export function canEditOrganizationSection(
  session: Session | null | undefined,
  organizationId: string,
  sectionSlug: string
): boolean {
  if (!session?.user) return false;
  if (isSiteAdmin(session)) return true;
  if (isSupervisionOnlyUser(session)) return false;
  if (isOrganizationManager(session)) {
    return canAccessOrganizationSection(session, organizationId, sectionSlug);
  }
  if (!isOrgUserEditableSection(sectionSlug)) return false;
  return canAccessOrganizationSection(session, organizationId, sectionSlug);
}

export function canAccessProjects(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  if (isSiteAdmin(session)) return true;
  return session.user.permissions?.canAccessProjects ?? false;
}

export function canAccessOrganizations(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  if (isSiteAdmin(session)) return true;
  return (session.user.permissions?.organizationIds.length ?? 0) > 0;
}

export function canAccessOrganization(
  session: Session | null | undefined,
  organizationId: string
): boolean {
  if (!session?.user) return false;
  if (isSiteAdmin(session)) return true;
  return session.user.permissions?.organizationIds.includes(organizationId) ?? false;
}

export function canAccessSection(
  session: Session | null | undefined,
  sectionSlug: string
): boolean {
  if (!session?.user) return false;
  if (isSiteAdmin(session)) return true;
  if (!hasOrganizationAccess(session)) return false;
  return getGrantedSectionSlugs(session).has(sectionSlug);
}

export function canAccessOrganizationSection(
  session: Session | null | undefined,
  organizationId: string,
  sectionSlug: string
): boolean {
  return (
    canAccessOrganization(session, organizationId) && canAccessSection(session, sectionSlug)
  );
}

export function filterOrganizationsForSession(
  session: Session | null | undefined,
  organizations: Organization[]
): Organization[] {
  if (isSiteAdmin(session)) return organizations;
  const allowed = session?.user?.permissions?.organizationIds ?? [];
  return organizations.filter((org) => allowed.includes(org.id));
}

export function filterDirectionsForSession(
  session: Session | null | undefined,
  directions: ActivityDirection[]
): ActivityDirection[] {
  if (isSiteAdmin(session)) return directions;
  if (isOrganizationManager(session) || isSupervisionOnlyUser(session)) {
    return directions;
  }
  const granted = getGrantedSectionSlugs(session);
  return directions.filter((direction) => granted.has(direction.slug));
}
