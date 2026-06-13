'use client';

import { logoutAction } from '@/app/actions/auth';
import { useLiveChat } from '@/contexts/live-chat-context';
import { Link, usePathname } from '@/i18n/navigation';
import {
  canAccessOrganizations,
  canAccessProjects,
} from '@/lib/user-access';
import { isSiteAdmin } from '@/lib/is-admin';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import LangSwitcher from './LangSwitcher';

const USER_ROOM_NAV_STORAGE_KEY = 'user-room-nav-open';

type NavItem = {
  href: '/room' | '/dashboard' | '/organizations';
  labelKey: string;
  icon: string;
  match: (path: string) => boolean;
};

export default function GovPortalHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = isSiteAdmin(session);
  const { enabled: liveChatEnabled, openChat } = useLiveChat();
  const [isPending, startTransition] = useTransition();
  const [navOpen, setNavOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_ROOM_NAV_STORAGE_KEY);
      if (stored === '0') {
        setNavOpen(false);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const navItems: NavItem[] = [
    {
      href: '/room',
      labelKey: 'userRoomNavHome',
      icon: '🏠',
      match: (path) => path === '/room',
    },
    ...(canAccessProjects(session)
      ? [
          {
            href: '/dashboard' as const,
            labelKey: 'navProjects',
            icon: '📂',
            match: (path: string) => path === '/dashboard' || path.startsWith('/dashboard/'),
          },
        ]
      : []),
    ...(canAccessOrganizations(session)
      ? [
          {
            href: '/organizations' as const,
            labelKey: 'navOrganizations',
            icon: '🏢',
            match: (path: string) => path.startsWith('/organizations'),
          },
        ]
      : []),
  ];

  function handleLogout() {
    startTransition(async () => {
      try {
        await logoutAction(locale);
      } catch {
        window.location.assign(`/${locale}/login`);
      }
    });
  }

  function toggleNav() {
    setNavOpen((current) => {
      const next = !current;
      try {
        localStorage.setItem(USER_ROOM_NAV_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div className="gov-header-top">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
              <div className="gov-emblem" aria-hidden>
                🦅
              </div>
              <div className="min-w-0">
                <p className="gov-site-title">{t('siteName')}</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {t('userRoomPortalTagline')}
                </p>
              </div>
            </Link>
            {navItems.length > 0 && (
              <button
                type="button"
                className="gov-nav-toggle"
                onClick={toggleNav}
                aria-expanded={navOpen}
                aria-controls="user-room-nav"
              >
                <span aria-hidden>{navOpen ? '▲' : '▼'}</span>
                <span className="hidden sm:inline">
                  {navOpen ? t('userRoomHideMenu') : t('userRoomShowMenu')}
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {session?.user?.name && (
              <span className="hidden rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] sm:inline">
                {t('userRoomWelcomeShort')}: {session.user.name}
              </span>
            )}
            {liveChatEnabled && (
              <button
                type="button"
                onClick={openChat}
                className="btn-secondary text-[11px]"
              >
                <span aria-hidden>💬</span>
                <span className="hidden sm:inline">{t('navLiveChat')}</span>
              </button>
            )}
            {isAdmin && (
              <a
                href="https://github.com/yoqubkhoja1988"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary hidden text-[11px] lg:inline-flex"
              >
                {t('viewGithub')}
              </a>
            )}
            <LangSwitcher />
            <Link href="/" className="btn-secondary text-[11px]">
              ← {t('publicBackToSite')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="btn-secondary text-[11px] disabled:opacity-60"
            >
              {isPending ? '...' : t('logout')}
            </button>
          </div>
        </div>
      </div>

      {navItems.length > 0 && (
        <nav
          id="user-room-nav"
          className={`gov-header-nav ${navOpen ? '' : 'gov-header-nav--collapsed'}`}
          aria-label={t('navMenu')}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap px-3 md:px-6">
            {navItems.map(({ href, labelKey, icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`gov-nav-link ${active ? 'gov-nav-link-active' : ''}`}
                >
                  <span aria-hidden>{icon}</span>
                  <span>{t(labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
