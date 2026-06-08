'use client';

import { useTranslations } from 'next-intl';

export default function Logo({ centered = false }: { centered?: boolean }) {
  const t = useTranslations();

  return (
    <div className={`flex items-center gap-3 ${centered ? 'flex-col text-center' : ''}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-[var(--accent)] to-violet-500 text-lg font-bold text-white">
        Y
      </div>
      <div>
        <h1 className="text-lg font-bold">{t('siteName')}</h1>
        <p className="text-xs text-[var(--text-muted)]">{t('siteTagline')}</p>
      </div>
    </div>
  );
}
