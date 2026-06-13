'use client';

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
      <div className="relative shrink-0">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-[var(--accent)] to-emerald-500 opacity-40 blur-sm" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] via-indigo-500 to-emerald-500 text-sm font-bold text-white shadow-md shadow-blue-500/25">
          Y
        </div>
      </div>
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
      <Link href="/room" className="transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
