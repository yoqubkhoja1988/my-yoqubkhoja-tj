'use client';

import { logoutAction } from '@/app/actions/auth';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useTransition } from 'react';
import {
  canAccessOrganizations,
  canAccessProjects,
} from '@/lib/user-access';
import { isSiteAdmin } from '@/lib/is-admin';
import { useLiveChat } from '@/contexts/live-chat-context';
import LangSwitcher from './LangSwitcher';
import Logo from './Logo';

export default function AppHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = isSiteAdmin(session);
  const { enabled: liveChatEnabled, openChat } = useLiveChat();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      try {
        await logoutAction(locale);
      } catch {
        window.location.assign(`/${locale}/login`);
      }
    });
  }

  const navItems = [
    ...(canAccessProjects(session)
      ? [{ href: '/dashboard' as const, labelKey: 'navProjects', icon: '📂' }]
      : []),
    ...(canAccessOrganizations(session)
      ? [{ href: '/organizations' as const, labelKey: 'navOrganizations', icon: '🏢' }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="mx-auto max-w-6xl px-3 md:px-6">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <Logo compact />

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {navItems.length > 0 && (
              <nav
                aria-label={t('navMenu')}
                className="flex gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-0.5"
              >
                {navItems.map(({ href, labelKey, icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
                        active
                          ? 'bg-gradient-to-br from-[var(--accent)] to-indigo-500 text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
                      }`}
                    >
                      <span className="text-sm" aria-hidden>
                        {icon}
                      </span>
                      <span className="hidden whitespace-nowrap sm:inline">{t(labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {isAdmin && (
              <a
                href="https://github.com/yoqubkhoja1988"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary hidden lg:inline-flex"
              >
                {t('viewGithub')}
              </a>
            )}
            {liveChatEnabled && (
              <button
                type="button"
                onClick={openChat}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20"
              >
                <span aria-hidden>💬</span>
                <span className="hidden sm:inline">{t('navLiveChat')}</span>
              </button>
            )}
            <LangSwitcher />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="btn-secondary disabled:opacity-60"
            >
              {isPending ? '...' : t('logout')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
