'use client';

import { StaffAnalytics } from '@/lib/staff-analytics';
import { VacancyNoticeInfo } from '@/types/organization-section';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import { printDocument } from '@/lib/print-document';
import { useTranslations } from 'next-intl';

type Props = {
  organizationName: string;
  analytics: StaffAnalytics;
  notice?: VacancyNoticeInfo;
  editing?: boolean;
  onNoticeChange?: (notice: VacancyNoticeInfo) => void;
};

const defaultNotice = (t: (key: string) => string): VacancyNoticeInfo => ({
  intro: t('vacancyNoticeDefaultIntro'),
  requirements: t('vacancyNoticeDefaultRequirements'),
  publishedAt: new Date().toISOString().slice(0, 10),
});

export default function StaffVacancyNotice({
  organizationName,
  analytics,
  notice,
  editing = false,
  onNoticeChange,
}: Props) {
  const t = useTranslations();
  const vacantSlots = analytics.slots.filter((slot) => slot.vacant > 0);
  const info: VacancyNoticeInfo = { ...defaultNotice(t), ...notice };

  function update(field: keyof VacancyNoticeInfo, value: string) {
    onNoticeChange?.({ ...info, [field]: value });
  }

  function handlePrint() {
    printDocument('vacancy-notice-document');
  }

  if (vacantSlots.length === 0 && !editing) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm font-bold">{t('vacancyNoticeTitle')}</p>
        {vacantSlots.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handlePrint} className="btn-secondary text-xs">
              {t('vacancyNoticePrint')}
            </button>
            <DocumentExportMenu
              documentId="vacancy-notice-document"
              filename="vakansiya"
            />
          </div>
        )}
      </div>

      {editing && onNoticeChange && (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-4 print:hidden">
          <div>
            <label className="field-label">{t('vacancyNoticeIntro')}</label>
            <textarea
              value={info.intro || ''}
              onChange={(e) => update('intro', e.target.value)}
              rows={3}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="field-label">{t('vacancyNoticeRequirements')}</label>
            <textarea
              value={info.requirements || ''}
              onChange={(e) => update('requirements', e.target.value)}
              rows={2}
              className="input-field text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="field-label">{t('vacancyNoticePublishedAt')}</label>
              <input
                type="date"
                value={info.publishedAt || ''}
                onChange={(e) => update('publishedAt', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="field-label">{t('vacancyNoticeContactPhone')}</label>
              <input
                value={info.contactPhone || ''}
                onChange={(e) => update('contactPhone', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="field-label">{t('vacancyNoticeContactEmail')}</label>
              <input
                type="email"
                value={info.contactEmail || ''}
                onChange={(e) => update('contactEmail', e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
      )}

      {vacantSlots.length > 0 && (
        <article
          id="vacancy-notice-document"
          className="vacancy-notice-document rounded-xl border border-[var(--border)] bg-white/5 p-5 md:p-6"
        >
          <header className="border-b border-[var(--border)] pb-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
              {t('vacancyNoticeRepublic')}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{t('vacancyNoticeCommittee')}</p>
            <h5 className="mt-3 text-sm font-bold leading-snug md:text-base">{organizationName}</h5>
          </header>

          <div className="py-4 text-center">
            <h6 className="text-base font-bold uppercase tracking-wide md:text-lg">
              {t('vacancyNoticeHeading')}
            </h6>
            <p className="mt-1 text-xs text-[var(--text-muted)] print-supplement">
              {t('vacancyNoticeSubheading')}
            </p>
            {info.publishedAt && (
              <p className="mt-2 text-xs">
                {t('vacancyNoticeDate')}:{' '}
                <span className="font-semibold">{info.publishedAt}</span>
              </p>
            )}
          </div>

          <p className="mb-4 text-justify text-xs leading-relaxed md:text-sm">{info.intro}</p>

          <div className="table-wrapper table-scroll-sm">
            <table>
              <thead>
                <tr>
                  <th>{t('staffColNo')}</th>
                  <th>{t('employeeDepartment')}</th>
                  <th>{t('employeePosition')}</th>
                  <th>{t('vacancyNoticeCount')}</th>
                  <th>{t('vacancyNoticeBaseSalary')}</th>
                  <th>{t('vacancyNoticeMonthlyWage')}</th>
                  <th>{t('vacancyNoticeHarmfulPercent')}</th>
                </tr>
              </thead>
              <tbody>
                {vacantSlots.map((slot, index) => (
                  <tr key={`${slot.department}-${slot.position}`}>
                    <td>{index + 1}</td>
                    <td>{slot.department}</td>
                    <td className="font-semibold text-[var(--accent)]">{slot.position}</td>
                    <td className="font-bold text-amber-400">{slot.vacant}</td>
                    <td>{slot.baseSalary || '—'}</td>
                    <td>{slot.monthlyWage || '—'}</td>
                    <td>{slot.harmfulPercent || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="font-semibold">
                    {t('vacancyNoticeTotal')}
                  </td>
                  <td className="font-bold">{analytics.totalVacant}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {info.requirements && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
                {t('vacancyNoticeRequirements')}
              </p>
              <p className="mt-1 text-xs leading-relaxed md:text-sm">{info.requirements}</p>
            </div>
          )}

          <footer className="mt-5 border-t border-[var(--border)] pt-4 text-xs">
            <p className="font-semibold">{t('vacancyNoticeContact')}</p>
            {(info.contactPhone || info.contactEmail) && (
              <p className="mt-1 text-[var(--text-muted)]">
                {info.contactPhone && (
                  <span>
                    {t('employeePhone')}: {info.contactPhone}
                  </span>
                )}
                {info.contactPhone && info.contactEmail && ' · '}
                {info.contactEmail && (
                  <span>
                    {t('employeeEmail')}: {info.contactEmail}
                  </span>
                )}
              </p>
            )}
            <p className="mt-3 text-[10px] text-[var(--text-muted)]">{t('vacancyNoticeFooter')}</p>
          </footer>
        </article>
      )}
    </div>
  );
}
