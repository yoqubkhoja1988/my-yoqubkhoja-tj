'use client';

import { getTelegramUrl, getTelegramUsername } from '@/lib/contact';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function PublicPortalFooter() {
  const t = useTranslations();
  const telegramUrl = getTelegramUrl();
  const telegramUsername = getTelegramUsername();

  return (
    <footer className="mt-8 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="mx-auto max-w-6xl px-3 py-6 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
              {t('publicSiteOrgName')}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
              {t('publicFooterAbout')}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
              {t('publicFooterLinks')}
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                <Link href="/#about" className="text-[var(--accent)] hover:underline">
                  {t('publicNavAbout')}
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[var(--accent)] hover:underline">
                  {t('publicNavCabinet')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
              {t('publicNavContact')}
            </p>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline"
            >
              Telegram: @{telegramUsername}
            </a>
          </div>
        </div>
        <p className="mt-6 border-t border-[var(--border)] pt-4 text-center text-[11px] text-[var(--text-muted)]">
          &copy; 2026 {t('siteName')} — {t('allRights')}
        </p>
      </div>
    </footer>
  );
}
