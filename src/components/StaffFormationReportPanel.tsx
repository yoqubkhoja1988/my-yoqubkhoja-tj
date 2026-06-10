'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import { formatAppDate } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import { StaffAnalytics } from '@/lib/staff-analytics';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

type Props = {
  organizationName: string;
  analytics: StaffAnalytics | null;
};

export default function StaffFormationReportPanel({ organizationName, analytics }: Props) {
  const t = useTranslations();
  const locale = useLocale();

  const reportDate = formatAppDate(new Date(), locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const departments = useMemo(() => {
    if (!analytics) return [];
    const map = new Map<string, typeof analytics.slots>();
    for (const slot of analytics.slots) {
      const list = map.get(slot.department) ?? [];
      list.push(slot);
      map.set(slot.department, list);
    }
    return [...map.entries()];
  }, [analytics]);

  function handlePrint() {
    printDocument('formation-report-document');
  }

  if (!analytics) {
    return <p className="text-xs text-[var(--text-muted)]">{t('formationReportNoStaff')}</p>;
  }

  if (analytics.slots.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">{t('formationReportNoData')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <p className="page-eyebrow">{t('formationReportTitle')}</p>
          <h4 className="text-sm font-bold">{t('formationReportHeading')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('formationReportSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handlePrint} className="btn-secondary text-xs">
            {t('formationReportPrint')}
          </button>
          <DocumentExportMenu documentId="formation-report-document" filename="formation-report" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('staffStatQuota')}</p>
          <p className="mt-0.5 text-xl font-bold text-blue-400">{analytics.totalQuota}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('staffStatRegistered')}</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-400">{analytics.totalActive}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('staffStatVacant')}</p>
          <p className="mt-0.5 text-xl font-bold text-amber-400">{analytics.totalVacant}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('staffStatMonthlyFund')}</p>
          <p className="mt-0.5 text-sm font-bold text-violet-400">
            {analytics.monthlyFund ? `${analytics.monthlyFund} ${t('staffCurrency')}` : '—'}
          </p>
        </div>
      </div>

      <article
        id="formation-report-document"
        className="rounded-xl border border-[var(--border)] bg-white/5 p-5 md:p-6"
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
            {t('formationReportHeading')}
          </h6>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('formationReportSubheading')}</p>
          <p className="mt-2 text-xs">
            {t('formationReportDate')}: <span className="font-semibold">{reportDate}</span>
          </p>
        </div>

        {departments.map(([department, slots]) => {
          const deptQuota = slots.reduce((sum, slot) => sum + slot.quota, 0);
          const deptFilled = slots.reduce((sum, slot) => sum + slot.filled, 0);
          const deptVacant = slots.reduce((sum, slot) => sum + slot.vacant, 0);
          const deptOverfilled = slots.reduce((sum, slot) => sum + slot.overfilled, 0);

          return (
            <div key={department} className="mb-5 last:mb-0">
              <h6 className="mb-2 text-xs font-bold uppercase text-[var(--accent)]">{department}</h6>
              <div className="table-wrapper table-scroll-sm">
                <table>
                  <thead>
                    <tr>
                      <th>{t('staffColNo')}</th>
                      <th>{t('employeePosition')}</th>
                      <th>{t('staffColQuota')}</th>
                      <th>{t('formationReportFilled')}</th>
                      <th>{t('staffStatVacant')}</th>
                      <th>{t('formationReportOverfilled')}</th>
                      <th>{t('staffColBaseSalary')}</th>
                      <th>{t('staffColMonthlyWage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, index) => (
                      <tr key={`${slot.position}-${index}`}>
                        <td>{index + 1}</td>
                        <td className="font-semibold">{slot.position}</td>
                        <td>{slot.quota}</td>
                        <td className="text-emerald-400">{slot.filled}</td>
                        <td className={slot.vacant > 0 ? 'font-semibold text-amber-400' : ''}>
                          {slot.vacant}
                        </td>
                        <td className={slot.overfilled > 0 ? 'font-semibold text-red-400' : ''}>
                          {slot.overfilled}
                        </td>
                        <td>{slot.baseSalary || '—'}</td>
                        <td>{slot.monthlyWage || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="font-semibold">
                        {t('formationReportDeptSubtotal')}
                      </td>
                      <td className="font-bold">{deptQuota}</td>
                      <td className="font-bold">{deptFilled}</td>
                      <td className="font-bold">{deptVacant}</td>
                      <td className="font-bold">{deptOverfilled}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}

        <footer className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="table-wrapper">
            <table>
              <tbody>
                <tr>
                  <td className="font-bold">{t('formationReportGrandTotal')}</td>
                  <td className="font-bold">{analytics.totalQuota}</td>
                  <td className="font-bold text-emerald-400">{analytics.totalActive}</td>
                  <td className="font-bold text-amber-400">{analytics.totalVacant}</td>
                  <td className="font-bold text-red-400">{analytics.totalOverfilled}</td>
                  <td className="font-bold">
                    {analytics.monthlyFund
                      ? `${analytics.monthlyFund} ${t('staffCurrency')}`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </footer>
      </article>
    </div>
  );
}
