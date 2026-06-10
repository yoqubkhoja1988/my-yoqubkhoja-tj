'use client';

import { getTelegramUrl, getTelegramUsername } from '@/lib/contact';
import { isSiteAdmin } from '@/lib/is-admin';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

export default function AppFooter() {
  const t = useTranslations();
  const { data: session } = useSession();
  const isAdmin = isSiteAdmin(session);
  const telegramUrl = getTelegramUrl();
  const telegramUsername = getTelegramUsername();

  return (
    <footer className="mt-8 border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-3 py-5 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; 2026 <span className="font-semibold text-[var(--text)]">Yoqubkhoja Hub</span>
            {' — '}
            {t('allRights')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-400"
            >
              <TelegramIcon className="h-4 w-4 shrink-0 text-sky-400" />
              <span className="text-[var(--text-muted)]">{t('footerContact')}:</span>
              <span>@{telegramUsername}</span>
            </a>

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
      </div>
    </footer>
  );
}
