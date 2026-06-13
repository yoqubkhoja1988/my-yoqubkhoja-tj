'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import LangSwitcher from './LangSwitcher';

type NavItem = {
  href: string;
  labelKey: string;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'publicNavHome' },
  { href: '/#about', labelKey: 'publicNavAbout' },
  { href: '/#activity', labelKey: 'publicNavActivity' },
  { href: '/#services', labelKey: 'publicNavServices' },
  { href: '/#documents', labelKey: 'publicNavDocuments' },
  { href: '/#contact', labelKey: 'publicNavContact' },
];

export default function PublicPortalHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data: session } = useSession();
  const onHome = pathname === '/';

  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div className="gov-header-top">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
            <div className="gov-emblem" aria-hidden>
              🦅
            </div>
            <div className="min-w-0">
              <p className="gov-site-title">{t('publicSiteOrgName')}</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {t('publicSiteTagline')}
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <LangSwitcher />
            {session ? (
              <Link href="/room" className="btn-primary text-[11px]">
                {t('publicCabinetEnter')}
              </Link>
            ) : (
              <Link href="/login" className="btn-primary text-[11px]">
                {t('publicNavCabinet')}
              </Link>
            )}
          </div>
        </div>
      </div>

      <nav className="gov-header-nav" aria-label={t('navMenu')}>
        <div className="mx-auto flex max-w-6xl flex-wrap px-3 md:px-6">
          {NAV_ITEMS.map(({ href, labelKey }) => {
            const active = onHome && (href === '/' || href.startsWith('/#'));
            return (
              <Link
                key={labelKey}
                href={href}
                className={`gov-nav-link ${active && href === '/' ? 'gov-nav-link-active' : ''}`}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
