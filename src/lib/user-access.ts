import { Session } from 'next-auth';
import { isSiteAdmin } from '@/lib/is-admin';
import { UserPermissions } from '@/types/user';
import { Organization } from '@/types/organization';
import { ActivityDirection } from '@/types/activity-direction';
import { LEGAL_SECTION_SLUGS } from '@/lib/official-legal-catalog';

const AUTO_VISIBLE_LEGAL_SECTIONS = new Set<string>([
  LEGAL_SECTION_SLUGS.laws,
  LEGAL_SECTION_SLUGS.decisions,
  LEGAL_SECTION_SLUGS.documents,
]);

function hasOrganizationAccess(session: Session | null | undefined): boolean {
  if (!session?.user || isSiteAdmin(session)) return false;
  return (session.user.permissions?.organizationIds.length ?? 0) > 0;
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

/** Бахшҳои гурӯҳи «Оиннома ва ҳуҷҷатҳои ҳуқуқӣ» */
export const CHARTER_LEGAL_SECTION_SLUGS = [
  'charter',
  'legal',
  LEGAL_SECTION_SLUGS.laws,
  LEGAL_SECTION_SLUGS.decisions,
  LEGAL_SECTION_SLUGS.documents,
] as const;

export function isCharterLegalSection(sectionSlug: string): boolean {
  return (CHARTER_LEGAL_SECTION_SLUGS as readonly string[]).includes(sectionSlug);
}

/** Таҳрири ҳуҷҷатҳои оиннома/қонунӣ — барои корбари ташкилот бо дастрасӣ ба бахш */
export function canEditOrganizationSection(
  session: Session | null | undefined,
  organizationId: string,
  sectionSlug: string
): boolean {
  if (!session?.user) return false;
  if (isSiteAdmin(session)) return true;
  if (isSupervisionOnlyUser(session)) return false;
  if (!isCharterLegalSection(sectionSlug)) return false;
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
  const permissions = session.user.permissions;
  if (
    permissions?.supervisionOnly &&
    (permissions.organizationIds.length ?? 0) > 0
  ) {
    return true;
  }
  if (AUTO_VISIBLE_LEGAL_SECTIONS.has(sectionSlug) && hasOrganizationAccess(session)) {
    return true;
  }
  return permissions?.sectionSlugs.includes(sectionSlug) ?? false;
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
  if (isSupervisionOnlyUser(session)) return directions;
  const allowedSections = session?.user?.permissions?.sectionSlugs ?? [];
  const orgAccess = hasOrganizationAccess(session);
  return directions.filter(
    (direction) =>
      allowedSections.includes(direction.slug) ||
      (orgAccess && AUTO_VISIBLE_LEGAL_SECTIONS.has(direction.slug))
  );
}
