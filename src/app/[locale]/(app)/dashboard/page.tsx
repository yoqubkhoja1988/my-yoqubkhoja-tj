import { getAuthSession } from '@/lib/auth-session';
import DashboardContent from '@/components/DashboardContent';
import { isSiteAdmin } from '@/lib/is-admin';
import { canAccessOrganizations, canAccessProjects } from '@/lib/user-access';
import { redirect } from '@/i18n/navigation';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getAuthSession();

  const isAdmin = isSiteAdmin(session);
  const projects = canAccessProjects(session);
  const organizations = canAccessOrganizations(session);

  if (!isAdmin && !projects) {
    redirect({ href: organizations ? '/organizations' : '/room', locale });
  }

  return (
    <DashboardContent
      isAdmin={isAdmin}
      canAccessProjects={projects}
      canAccessOrganizations={organizations}
    />
  );
}
