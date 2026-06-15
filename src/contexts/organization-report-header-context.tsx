'use client';

import {
  defaultOrgInfoContent,
  resolveOrganizationReportName,
  resolveSuperiorAuthorities,
} from '@/lib/organization-info';
import { showOrganizationDocumentLogo } from '@/lib/organization-scope';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';
import { useLocale } from 'next-intl';
import { createContext, useContext, useMemo } from 'react';

export type ResolvedOrganizationReportHeader = {
  organizationId: string;
  organizationName: string;
  superiorAuthorities: string[];
  showDocumentLogo: boolean;
};

const OrganizationReportHeaderContext = createContext<ResolvedOrganizationReportHeader>({
  organizationId: '',
  organizationName: '',
  superiorAuthorities: [],
  showDocumentLogo: true,
});

export function OrganizationReportHeaderProvider({
  organization,
  orgInfoContent,
  children,
}: {
  organization: Organization;
  orgInfoContent: OrganizationSectionContent | null;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const value = useMemo(
    () => ({
      organizationId: organization.id,
      organizationName: resolveOrganizationReportName(
        orgInfoContent?.reportHeader,
        organization.name,
        locale
      ),
      superiorAuthorities: resolveSuperiorAuthorities(
        orgInfoContent?.reportHeader,
        (defaultOrgInfoContent(organization.id).reportHeader?.superiorAuthorities ?? [])
          .map((line) => line.trim())
          .filter(Boolean)
      ),
      showDocumentLogo: showOrganizationDocumentLogo(organization.id),
    }),
    [organization.id, organization.name, orgInfoContent?.reportHeader, locale]
  );

  return (
    <OrganizationReportHeaderContext.Provider value={value}>
      {children}
    </OrganizationReportHeaderContext.Provider>
  );
}

export function useOrganizationReportHeader(): ResolvedOrganizationReportHeader {
  return useContext(OrganizationReportHeaderContext);
}
