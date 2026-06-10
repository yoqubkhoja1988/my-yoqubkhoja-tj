'use client';

import { isSiteAdmin } from '@/lib/is-admin';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export default function AppFooter() {
  const t = useTranslations();
  const { data: session } = useSession();
  const isAdmin = isSiteAdmin(session);

  return (
    <footer className="mt-8 border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-3 py-5 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; 2026 <span className="font-semibold text-[var(--text)]">Yoqubkhoja Hub</span>
            {' — '}
            {t('allRights')}
          </p>
          {isAdmin && (
            <a
              href="https://github.com/yoqubkhoja1988"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
            >
              <span aria-hidden>↗</span>
              github.com/yoqubkhoja1988
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
