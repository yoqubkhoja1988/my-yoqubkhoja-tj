import { auth } from '@/auth';
import { getActivityDirections } from '@/lib/activity-directions';
import { readOrganizationsFile } from '@/lib/organizations-store';
import {
  canAccessOrganization,
  filterDirectionsForSession,
} from '@/lib/user-access';
import { redirect } from '@/i18n/navigation';
import { notFound } from 'next/navigation';

export default async function OrganizationIndexPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();

  if (!session) {
    redirect({ href: '/login', locale });
  }

  const organization = (await readOrganizationsFile()).find((item) => item.id === id);
  if (!organization || !canAccessOrganization(session, id)) {
    notFound();
  }

  const allowedDirections = filterDirectionsForSession(
    session,
    getActivityDirections(id)
  );
  const targetSection = allowedDirections[0]?.slug ?? 'overview';
  redirect({ href: `/organizations/${id}/${targetSection}`, locale });
}
