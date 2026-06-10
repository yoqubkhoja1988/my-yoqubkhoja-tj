'use client';

import { analyzeStaffing } from '@/lib/staff-analytics';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import { OrganizationSectionContent } from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type Props = {
  staffContent?: OrganizationSectionContent | null;
};

export default function FinancePayrollPanel({ staffContent }: Props) {
  const t = useTranslations();

  const payrollRows = useMemo(() => {
    if (!staffContent?.tables) return [];

    return staffContent.tables
      .filter((table) => table.title.toLowerCase().includes('ҳамагӣ'))
      .map((table) => {
        const monthlyIndex = table.columns.findIndex((column) => {
          const lower = column.toLowerCase();
          return lower.includes('музди') && lower.includes('моҳона');
        });
        const staffIndex = table.columns.findIndex((column) => {
          const lower = column.toLowerCase();
          return lower.includes('штат') || lower.includes('воҳид') || lower.includes('шумора');
        });

        const row = table.rows[0] ?? [];
        const monthlyWage = monthlyIndex >= 0 ? row[monthlyIndex] : '—';
        const staffCount = staffIndex >= 0 ? row[staffIndex] : '—';
        const monthlyValue = monthlyIndex >= 0 ? parseAmount(row[monthlyIndex]) : null;

        return {
          title: table.title,
          staffCount,
          monthlyWage,
          annualWage:
            monthlyValue !== null ? `${formatAmount(monthlyValue * 12)} сомонӣ` : '—',
        };
      });
  }, [staffContent]);

  const staffAnalytics = useMemo(
    () => (staffContent ? analyzeStaffing(staffContent) : null),
    [staffContent]
  );

  return (
    <section id="finance-payroll" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div>
        <p className="page-eyebrow">{t('financeNavPayroll')}</p>
        <h4 className="text-sm font-bold">{t('financePayrollTitle')}</h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{t('financePayrollSubtitle')}</p>
      </div>

      {!staffContent ? (
        <p className="text-xs text-[var(--text-muted)]">{t('financePayrollNoStaff')}</p>
      ) : payrollRows.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">{t('financePayrollNoData')}</p>
      ) : (
        <>
          <div className="rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-xs">
            <p className="font-semibold text-[var(--accent)]">{t('financePayrollTotal')}</p>
            <p className="mt-1 text-lg font-bold">
              {staffAnalytics?.monthlyFund
                ? `${staffAnalytics.monthlyFund} ${t('staffCurrency')} / ${t('financePerMonth')}`
                : '—'}
            </p>
          </div>

          <div className="table-wrapper table-scroll-sm">
            <table>
              <thead>
                <tr>
                  <th>{t('financePayrollGroup')}</th>
                  <th>{t('staffStatQuota')}</th>
                  <th>{t('financeMonthlyWage')}</th>
                  <th>{t('financeAnnualWage')}</th>
                </tr>
              </thead>
              <tbody>
                {payrollRows.map((row) => (
                  <tr key={row.title}>
                    <td className="font-semibold">{row.title}</td>
                    <td>{row.staffCount}</td>
                    <td className="text-emerald-400">{row.monthlyWage}</td>
                    <td>{row.annualWage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
