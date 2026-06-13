'use client';

import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import UserContentText from '@/components/UserContentText';
import { useTranslations } from 'next-intl';

type Props = {
  variant?: 'app' | 'document';
  className?: string;
  showAddress?: string;
};

export default function OrganizationReportDocumentHeader({
  variant = 'app',
  className = '',
  showAddress,
}: Props) {
  const t = useTranslations();
  const { organizationName, superiorAuthorities } = useOrganizationReportHeader();

  if (variant === 'document') {
    return (
      <header className={`mb-6 text-center text-xs leading-relaxed text-slate-700 ${className}`}>
        <p>{t('payrollLedgerRepublic')}</p>
        {superiorAuthorities.map((line) => (
          <p key={line}>
            <UserContentText text={line} as="span" />
          </p>
        ))}
        <p className="mt-2 text-sm font-bold uppercase text-slate-900">{organizationName}</p>
        {showAddress ? (
          <p className="mt-1">
            <UserContentText text={showAddress} as="span" />
          </p>
        ) : null}
      </header>
    );
  }

  return (
    <header className={`border-b border-[var(--border)] pb-4 text-center ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
        {t('vacancyNoticeRepublic')}
      </p>
      {superiorAuthorities.map((line) => (
        <p key={line} className="mt-1 text-xs text-[var(--text-muted)]">
          <UserContentText text={line} as="span" />
        </p>
      ))}
      <h5 className="mt-3 text-sm font-bold leading-snug md:text-base">{organizationName}</h5>
    </header>
  );
}
