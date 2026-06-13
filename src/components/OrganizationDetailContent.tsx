'use client';

import { resolveOrganizationReportName } from '@/lib/organization-info';
import UserContentText from '@/components/UserContentText';
import { Link } from '@/i18n/navigation';
import {
  getActivityDirection,
  getActivityDirections,
  groupActivityDirections,
} from '@/lib/activity-directions';
import {
  canEditOrganizationSection,
  filterDirectionsForSession,
  isSupervisionOnlyUser,
} from '@/lib/user-access';
import { OrganizationAccessProvider } from '@/contexts/organization-access-context';
import { OrganizationReportHeaderProvider } from '@/contexts/organization-report-header-context';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';
import { useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { useMemo } from 'react';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';
import EditableSectionContent from './EditableSectionContent';

type Props = {
  organization: Organization;
  section: string;
  sectionContent: OrganizationSectionContent | null;
  staffContent?: OrganizationSectionContent | null;
  orgInfoContent?: OrganizationSectionContent | null;
};

function ContentCard({ children }: { children: React.ReactNode }) {
  return <div className="glass-card p-4 md:p-5">{children}</div>;
}

function SectionHeader({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-[var(--border)] pb-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-emerald-500/10 text-lg">
        <span aria-hidden>{icon}</span>
      </div>
      <h3 className="text-base font-bold tracking-tight md:text-lg">{title}</h3>
    </div>
  );
}

function OverviewPanel({ organization }: { organization: Organization }) {
  const t = useTranslations();

  const rows = [
    { label: t('organizationRma'), value: organization.rma },
    { label: t('organizationRyam'), value: organization.ryam },
    { label: t('organizationAddress'), value: organization.address },
    { label: t('organizationDirector'), value: organization.director },
    { label: t('organizationChiefAccountant'), value: organization.chiefAccountant },
    { label: t('organizationDirectorPhone'), value: organization.directorPhone },
    {
      label: t('organizationChiefAccountantPhone'),
      value: organization.chiefAccountantPhone,
    },
    { label: t('organizationStatus'), value: organization.status },
  ].filter((row) => row.value);

  return (
    <ContentCard>
      <SectionHeader icon="🏠" title={t('actOverview')} />
      {organization.description?.trim() && (
        <p className="mb-4 text-xs leading-relaxed text-[var(--text-muted)] md:text-sm">
          <UserContentText text={organization.description.trim()} as="span" />
        </p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </ContentCard>
  );
}

function SectionPanel({
  organization,
  section,
  sectionContent,
  staffContent,
  canEdit,
}: {
  organization: Organization;
  section: string;
  sectionContent: OrganizationSectionContent | null;
  staffContent?: OrganizationSectionContent | null;
  canEdit?: boolean;
}) {
  const organizationId = organization.id;
  const t = useTranslations();
  const direction = getActivityDirection(organizationId, section);

  if (!direction) {
    return (
      <ContentCard>
        <p className="text-center text-[var(--text-muted)]">{t('actNotFound')}</p>
      </ContentCard>
    );
  }

  if (!sectionContent) {
    return (
      <ContentCard>
        <SectionHeader icon={direction.icon} title={t(direction.labelKey)} />
        <p className="text-[var(--text-muted)]">{t('actComingSoon')}</p>
      </ContentCard>
    );
  }

  return (
    <ContentCard>
      <SectionHeader icon={direction.icon} title={t(direction.labelKey)} />
      <EditableSectionContent
        organizationId={organizationId}
        organizationName={organization.name}
        organization={organization}
        section={section}
        content={sectionContent}
        staffContent={staffContent}
        canEdit={canEdit}
      />
    </ContentCard>
  );
}

export default function OrganizationDetailContent({
  organization,
  section,
  sectionContent,
  staffContent,
  orgInfoContent = null,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();
  const displayOrgName = useMemo(
    () => resolveOrganizationReportName(orgInfoContent?.reportHeader, organization.name, locale),
    [orgInfoContent?.reportHeader, organization.name, locale]
  );
  const activeSection = section || 'overview';
  const canEdit = canEditOrganizationSection(session, organization.id, activeSection);
  const supervisionOnly = isSupervisionOnlyUser(session);
  const directions = useMemo(
    () => filterDirectionsForSession(session, getActivityDirections(organization.id)),
    [session, organization.id]
  );
  const grouped = groupActivityDirections(directions);

  const sidebar = (
    <div className="flex h-full flex-col p-3">
      <p className="page-eyebrow">{t('orgMenu')}</p>
      <h2 className="mt-2 text-sm font-bold leading-snug">{displayOrgName}</h2>
      {organization.rma && (
        <p className="mt-2 inline-block rounded-lg bg-[var(--bg-input)] px-2.5 py-1 font-mono text-xs text-[var(--text-muted)]">
          {t('organizationRma')}: {organization.rma}
        </p>
      )}

      <nav className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {grouped.map((group) => (
          <div key={group.groupKey}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              {t(group.groupKey)}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = activeSection === item.slug;
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/organizations/${organization.id}/${item.slug}`}
                      className={`menu-link ${active ? 'menu-link-active' : 'menu-link-inactive'}`}
                    >
                      <span aria-hidden>{item.icon}</span>
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <AppHeader />

      <div className="flex w-full">
        <aside className="hidden w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-elevated)]/70 backdrop-blur-xl lg:sticky lg:top-14 lg:block lg:h-[calc(100vh-3.5rem)] lg:self-start">
          {sidebar}
        </aside>

        <div className="min-w-0 flex-1">
          <main className="animate-in px-3 py-5 md:px-6">
            <Link href="/organizations" className="btn-ghost mb-4">
              ← {t('orgBackToList')}
            </Link>

            <aside className="mb-4 lg:hidden">
              <div className="glass-card">{sidebar}</div>
            </aside>

            <section className="min-w-0 w-full">
              {supervisionOnly && (
                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {t('supervisionOnlyBanner')}
                </div>
              )}
              <OrganizationAccessProvider canEdit={canEdit} supervisionOnly={supervisionOnly}>
              <OrganizationReportHeaderProvider
                organization={organization}
                orgInfoContent={orgInfoContent}
              >
              {activeSection === 'overview' ? (
                <OverviewPanel organization={organization} />
              ) : (
              <SectionPanel
                organization={organization}
                section={activeSection}
                sectionContent={sectionContent}
                staffContent={staffContent}
                canEdit={canEdit}
              />
              )}
              </OrganizationReportHeaderProvider>
              </OrganizationAccessProvider>
            </section>
          </main>

          <AppFooter />
        </div>
      </div>
    </>
  );
}
