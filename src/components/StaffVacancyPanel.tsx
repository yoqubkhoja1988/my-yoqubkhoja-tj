'use client';

import { StaffAnalytics } from '@/lib/staff-analytics';
import { VacancyNoticeInfo, OrganizationSectionContent } from '@/types/organization-section';
import { Organization } from '@/types/organization';
import { useTranslations } from 'next-intl';
import StaffVacancyNotice from './StaffVacancyNotice';

type Props = {
  organizationName: string;
  analytics: StaffAnalytics;
  vacancyNotice?: VacancyNoticeInfo;
  editing?: boolean;
  organization?: Organization;
  staffContent?: OrganizationSectionContent | null;
  onNoticeChange?: (notice: VacancyNoticeInfo) => void;
};

export default function StaffVacancyPanel({
  organizationName,
  analytics,
  vacancyNotice,
  editing,
  organization,
  staffContent,
  onNoticeChange,
}: Props) {
  const t = useTranslations();
  const relevantSlots = analytics.slots.filter(
    (slot) => slot.vacant > 0 || slot.overfilled > 0
  );

  return (
    <section id="staff-vacancy" className="space-y-4">
      <div>
        <p className="page-eyebrow">{t('staffVacancyTitle')}</p>
        <h4 className="text-sm font-bold">{t('staffVacancySubtitle')}</h4>
      </div>

      {relevantSlots.length === 0 ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          {t('staffAllPositionsFilled')}
        </div>
      ) : (
        <div className="table-wrapper table-scroll-sm">
          <table>
            <thead>
              <tr>
                <th>{t('employeeDepartment')}</th>
                <th>{t('employeePosition')}</th>
                <th>{t('staffStatQuota')}</th>
                <th>{t('staffStatRegistered')}</th>
                <th>{t('staffVacant')}</th>
                <th>{t('staffOverfilled')}</th>
              </tr>
            </thead>
            <tbody>
              {relevantSlots.map((slot) => (
                <tr key={`${slot.department}-${slot.position}`}>
                  <td>{slot.department}</td>
                  <td className="text-[var(--accent)]">{slot.position}</td>
                  <td>{slot.quota}</td>
                  <td>{slot.filled}</td>
                  <td className={slot.vacant > 0 ? 'font-semibold text-amber-400' : ''}>
                    {slot.vacant || '—'}
                  </td>
                  <td className={slot.overfilled > 0 ? 'font-semibold text-red-400' : ''}>
                    {slot.overfilled || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StaffVacancyNotice
        analytics={analytics}
        notice={vacancyNotice}
        editing={editing}
        organization={organization}
        staffContent={staffContent}
        onNoticeChange={onNoticeChange}
      />
    </section>
  );
}
