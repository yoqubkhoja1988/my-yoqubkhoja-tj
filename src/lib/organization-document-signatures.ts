import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';

export type DocumentSignatureSlot = {
  label: string;
  name?: string;
};

export type OrganizationDocumentSignatures = {
  director: DocumentSignatureSlot;
  accountant: DocumentSignatureSlot;
  sealLabel: string;
};

export function resolveOrganizationDocumentSignatures(
  t: (key: string) => string,
  options: {
    organizationId?: string;
    organization?: Organization;
    staffContent?: OrganizationSectionContent | null;
  }
): OrganizationDocumentSignatures {
  const organizationId = options.organizationId ?? options.organization?.id;

  return {
    director: {
      label: getDirectorSignatureLabel(organizationId),
      name: options.organization?.director,
    },
    accountant: {
      label: getAccountantSignatureLabel(options.staffContent, {
        chiefAccountantName: options.organization?.chiefAccountant,
        fallback: t('payrollLedgerAccountant'),
      }),
      name: options.organization?.chiefAccountant,
    },
    sealLabel: t('payrollLedgerSeal'),
  };
}
