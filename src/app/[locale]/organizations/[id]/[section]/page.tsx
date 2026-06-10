import { auth } from '@/auth';
import OrganizationDetailContent from '@/components/OrganizationDetailContent';
import { getOrganizationSection } from '@/lib/organization-sections-store';
import { readOrganizationsFile } from '@/lib/organizations-store';
import { canAccessOrganizationSection } from '@/lib/user-access';
import { isSiteAdmin } from '@/lib/is-admin';
import { redirect } from '@/i18n/navigation';
import { notFound } from 'next/navigation';

export default async function OrganizationSectionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; section: string }>;
}) {
  const { locale, id, section } = await params;
  const session = await auth();

  if (!session) {
    redirect({ href: '/login', locale });
  }

  const organization = readOrganizationsFile().find((item) => item.id === id);
  if (!organization) {
    notFound();
  }

  if (!canAccessOrganizationSection(session, id, section)) {
    notFound();
  }

  const sectionContent = getOrganizationSection(id, section);
  const staffContent =
    section === 'finance' || section === 'formation-report'
      ? getOrganizationSection(id, 'staff')
      : null;

  return (
    <OrganizationDetailContent
      organization={organization}
      section={section}
      sectionContent={sectionContent}
      staffContent={staffContent}
      canEdit={isSiteAdmin(session)}
    />
  );
}
