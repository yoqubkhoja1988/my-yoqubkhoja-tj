'use client';

import LegalDocumentsHub from '@/components/LegalDocumentsHub';
import InnovationCenterBuilding from '@/components/InnovationCenterBuilding';
import { Link } from '@/i18n/navigation';
import { initializeOrganizations } from '@/lib/organizations';
import { canAccessOrganization, canAccessOrganizations, canAccessProjects } from '@/lib/user-access';
import { isSiteAdmin } from '@/lib/is-admin';
import { Organization } from '@/types/organization';
import { useAccessSession, useUserPermissionsState } from '@/contexts/user-permissions-context';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, useTransition } from 'react';

const SECTION_LABEL_KEYS: Record<string, string> = {
  overview: 'actOverview',
  'org-info': 'actOrgInfo',
  staff: 'actStaff',
  finance: 'actFinance',
  legal: 'actLegal',
  laws: 'actLaws',
  'government-decisions': 'actGovernmentDecisions',
  'official-documents': 'actOfficialDocuments',
};

export default function UserRoomHome({
  canAccessProjects: showProjects,
  canAccessOrganizations: showOrganizations,
  isAdmin = false,
}: {
  canAccessProjects?: boolean;
  canAccessOrganizations?: boolean;
  isAdmin?: boolean;
}) {
  const t = useTranslations();
  const { data: session } = useAccessSession();
  const { permissions, permissionsUpdatedAt, loading: permissionsLoading, refresh } =
    useUserPermissionsState();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isRefreshing, startRefresh] = useTransition();

  useEffect(() => {
    void initializeOrganizations().then((data) => {
      setOrganizations(data);
    });
  }, [permissions, session?.user?.id]);

  const accessibleOrganizations = useMemo(() => {
    if (!permissions) return [];
    return organizations.filter((org) => permissions.organizationIds.includes(org.id));
  }, [organizations, permissions]);

  const visibleOrganizations = useMemo(() => {
    if (!session) return [];
    if (isSiteAdmin(session)) return organizations;
    return organizations.filter((org) => canAccessOrganization(session, org.id));
  }, [organizations, session]);

  const showProjectsEffective = session ? canAccessProjects(session) : (showProjects ?? false);
  const showOrganizationsEffective = session
    ? canAccessOrganizations(session)
    : (showOrganizations ?? false);

  const quickLinks = [
    ...(showProjectsEffective
      ? [
          {
            href: '/dashboard' as const,
            icon: '📂',
            titleKey: 'userRoomCardProjects',
            descKey: 'userRoomCardProjectsDesc',
          },
        ]
      : []),
    ...(showOrganizationsEffective
      ? [
          {
            href: '/organizations' as const,
            icon: '🏢',
            titleKey: 'userRoomCardOrganizations',
            descKey: 'userRoomCardOrganizationsDesc',
          },
        ]
      : []),
  ];

  return (
    <main className="page-shell animate-in">
      <section className="hero-gradient mb-5 rounded-xl p-5 md:p-6">
        <p className="page-eyebrow">{t('userRoomEyebrow')}</p>
        <h1 className="page-title">{t('userRoomTitle')}</h1>
        <p className="page-subtitle">{t('userRoomSubtitle')}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="gov-content-panel inline-flex items-center gap-3 !p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 text-lg">
              👤
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">{t('userRoomProfileLabel')}</p>
              <p className="text-sm font-bold">{session?.user?.name ?? '—'}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isAdmin ? t('userRoomRoleAdmin') : t('userRoomRoleUser')}
              </p>
              {!isAdmin && permissions && (
                <div className="mt-1 space-y-1 text-[10px] text-[var(--text-muted)]">
                  <p>
                    {permissions.organizationIds.length} {t('navOrganizations').toLowerCase()} ·{' '}
                    {permissions.sectionSlugs.length} бахш
                    {permissions.supervisionOnly ? ' · назорат' : ''}
                  </p>
                  {accessibleOrganizations.length > 0 && (
                    <p className="leading-relaxed">
                      {accessibleOrganizations.map((org) => org.name).join(' · ')}
                    </p>
                  )}
                  {!permissions.supervisionOnly && permissions.sectionSlugs.length > 0 && (
                    <p className="leading-relaxed">
                      {permissions.sectionSlugs
                        .slice(0, 6)
                        .map((slug) =>
                          SECTION_LABEL_KEYS[slug] ? t(SECTION_LABEL_KEYS[slug]) : slug
                        )
                        .join(' · ')}
                      {permissions.sectionSlugs.length > 6 ? ' …' : ''}
                    </p>
                  )}
                  {permissionsUpdatedAt && (
                    <p className="font-mono text-[9px] opacity-80">
                      {new Date(permissionsUpdatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              {!isAdmin && (
                <button
                  type="button"
                  className="mt-2 text-[10px] font-semibold text-[var(--accent)] hover:underline disabled:opacity-60"
                  disabled={permissionsLoading || isRefreshing}
                  onClick={() => startRefresh(() => refresh())}
                >
                  {permissionsLoading || isRefreshing ? '…' : '↻ Навсозии дастрасӣ'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {quickLinks.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            {t('userRoomQuickAccess')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickLinks.map(({ href, icon, titleKey, descKey }) => (
              <Link key={href} href={href} className="gov-room-card block">
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">{t(titleKey)}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showOrganizationsEffective && visibleOrganizations.length > 0 && (
        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {t('userRoomMyOrganizations')}
            </h2>
            <Link href="/organizations" className="text-xs font-semibold text-[var(--accent)] hover:underline">
              {t('userRoomViewAll')}
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleOrganizations.slice(0, 4).map((org) => (
              <Link
                key={org.id}
                href={`/organizations/${org.id}/overview`}
                className="gov-room-card block !p-3"
              >
                <p className="text-sm font-bold leading-snug">{org.name}</p>
                {org.rma && (
                  <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                    {t('organizationRma')}: {org.rma}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {!showProjectsEffective && !showOrganizationsEffective && (
        <section className="gov-content-panel mb-5">
          <p className="text-sm text-[var(--text-muted)]">{t('userRoomNoAccessHint')}</p>
        </section>
      )}

      {!isAdmin && showProjectsEffective && (
        <section className="mb-5">
          <InnovationCenterBuilding />
        </section>
      )}

      <section className="gov-content-panel">
        <LegalDocumentsHub />
      </section>
    </main>
  );
}
