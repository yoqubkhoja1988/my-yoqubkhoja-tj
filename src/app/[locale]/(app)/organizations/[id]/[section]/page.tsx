import { getAuthSession } from '@/lib/auth-session';
import OrganizationDetailContent from '@/components/OrganizationDetailContent';
import {
  DEFAULT_FINANCIAL_REPORTS_CONTENT,
  isFinancialReportSection,
  resolveFinancialReportStorageSlug,
} from '@/lib/financial-reports-menu';
import {
  ORG_INFO_SECTION_SLUG,
  defaultOrgInfoContent,
} from '@/lib/organization-info';
import { syncOfficialLegalForOrganization } from '@/lib/official-legal-sync';
import { LEGAL_SECTION_SLUGS } from '@/lib/official-legal-catalog';
import { getOrganizationSection } from '@/lib/organization-sections-store';
import { readOrganizationsFile } from '@/lib/organizations-store';
import { canAccessOrganizationSection } from '@/lib/user-access';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrganizationSectionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; section: string }>;
}) {
  const { id, section } = await params;
  const session = await getAuthSession();

  const organization = (await readOrganizationsFile()).find((item) => item.id === id);
  if (!organization) {
    notFound();
  }

  if (!canAccessOrganizationSection(session, id, section)) {
    notFound();
  }

  const isLegalSection =
    section === LEGAL_SECTION_SLUGS.laws ||
    section === LEGAL_SECTION_SLUGS.decisions ||
    section === LEGAL_SECTION_SLUGS.documents;

  const storageSlug = resolveFinancialReportStorageSlug(section);

  let sectionContent = await getOrganizationSection(id, storageSlug);
  if (isLegalSection && (!sectionContent || !sectionContent.items?.length)) {
    await syncOfficialLegalForOrganization(id);
    sectionContent = await getOrganizationSection(id, storageSlug);
  }
  if (isFinancialReportSection(section) && !sectionContent) {
    sectionContent = { ...DEFAULT_FINANCIAL_REPORTS_CONTENT };
  }
  if (section === ORG_INFO_SECTION_SLUG && !sectionContent) {
    sectionContent = defaultOrgInfoContent(id);
  }

  let orgInfoContent =
    section === ORG_INFO_SECTION_SLUG
      ? sectionContent
      : await getOrganizationSection(id, ORG_INFO_SECTION_SLUG);
  if (!orgInfoContent) {
    orgInfoContent = defaultOrgInfoContent(id);
  }
  const staffContent =
    section === 'finance' || section === 'formation-report'
      ? await getOrganizationSection(id, 'staff')
      : null;

  return (
    <OrganizationDetailContent
      organization={organization}
      section={section}
      sectionContent={sectionContent}
      staffContent={staffContent}
      orgInfoContent={orgInfoContent}
    />
  );
}
