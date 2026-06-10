import { Session } from 'next-auth';
import { isSiteAdmin } from '@/lib/is-admin';
import { UserPermissions } from '@/types/user';
import { Organization } from '@/types/organization';
import { ActivityDirection } from '@/types/activity-direction';

export function getSessionPermissions(session: Session | null | undefined): UserPermissions | null {
  if (!session?.user || isSiteAdmin(session)) return null;
  return session.user.permissions ?? null;
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
  return session.user.permissions?.sectionSlugs.includes(sectionSlug) ?? false;
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
  const allowedSections = session?.user?.permissions?.sectionSlugs ?? [];
  return directions.filter((direction) => allowedSections.includes(direction.slug));
}
