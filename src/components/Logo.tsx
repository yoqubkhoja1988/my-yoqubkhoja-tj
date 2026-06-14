'use client';

import OrganizationOfficialLogo from '@/components/OrganizationOfficialLogo';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function Logo({
  centered = false,
  compact = false,
}: {
  centered?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations();

  const content = (
    <div className={`flex items-center gap-2 ${centered ? 'flex-col text-center' : ''}`}>
      <OrganizationOfficialLogo variant="header" />
      <div className={compact ? 'min-w-0' : ''}>
        <h1 className={`font-bold tracking-tight ${compact ? 'truncate text-sm' : 'text-base'}`}>
          {t('siteName')}
        </h1>
        {!compact && (
          <p className="text-xs text-[var(--text-muted)]">{t('siteTagline')}</p>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Link href="/" className="transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
