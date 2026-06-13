import { auth } from '@/auth';
import OrganizationsContent from '@/components/OrganizationsContent';
import { isSiteAdmin } from '@/lib/is-admin';
import { canAccessOrganizations } from '@/lib/user-access';
import { redirect } from '@/i18n/navigation';

export default async function OrganizationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!canAccessOrganizations(session)) {
    redirect({ href: '/room', locale });
  }

  return <OrganizationsContent canManage={isSiteAdmin(session)} />;
}
