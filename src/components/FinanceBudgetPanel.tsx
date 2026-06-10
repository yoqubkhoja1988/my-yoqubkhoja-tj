'use client';

import { FinanceAnalytics, formatFinanceAmount } from '@/lib/finance-analytics';
import { useTranslations } from 'next-intl';

type Props = {
  analytics: FinanceAnalytics;
  onAddBudgetTables?: () => void;
  editing?: boolean;
};

export default function FinanceBudgetPanel({ analytics, onAddBudgetTables, editing }: Props) {
  const t = useTranslations();
  const hasCategories = analytics.categories.length > 0;
  const hasQuarterly = analytics.quarterly.length > 0;
  const hasData = analytics.annualBudget > 0 || hasCategories || hasQuarterly;

  return (
    <section id="finance-budget" className="space-y-4">
      <div>
        <p className="page-eyebrow">{t('financeNavBudget')}</p>
        <h4 className="text-base font-bold">{t('financeBudgetTitle')}</h4>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{t('financeBudgetSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t('financeStatBudget'), value: formatFinanceAmount(analytics.annualBudget) },
          { label: t('financeStatExecuted'), value: formatFinanceAmount(analytics.executed) },
          { label: t('financeStatRemaining'), value: formatFinanceAmount(analytics.remaining) },
          {
            label: t('financeStatExecution'),
            value: analytics.annualBudget > 0 ? `${analytics.executionPercent}%` : '—',
          },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
            <p className="mt-0.5 text-lg font-bold text-blue-400">{item.value}</p>
          </div>
        ))}
      </div>

      {analytics.payrollSharePercent !== null && analytics.annualBudget > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {t('financeBudgetPayrollShare', {
            percent: analytics.payrollSharePercent,
            annual: formatFinanceAmount(analytics.annualPayroll),
          })}
        </p>
      )}

      {!hasData && (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-input)]/30 p-4 text-sm text-[var(--text-muted)]">
          <p>{t('financeBudgetEmpty')}</p>
          {editing && onAddBudgetTables && (
            <button type="button" onClick={onAddBudgetTables} className="btn-secondary mt-3 text-xs">
              + {t('financeBudgetAddTables')}
            </button>
          )}
        </div>
      )}

      {hasCategories && (
        <div className="space-y-2">
          <h5 className="text-sm font-bold">{t('financeBudgetCategories')}</h5>
          <div className="table-wrapper table-scroll-sm">
            <table>
              <thead>
                <tr>
                  <th>{t('financeBudgetColArticle')}</th>
                  <th>{t('financeBudgetColPlanned')}</th>
                  <th>{t('financeBudgetColExecuted')}</th>
                  <th>{t('financeBudgetColPercent')}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.categories.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{formatFinanceAmount(row.planned)}</td>
                    <td>{formatFinanceAmount(row.executed)}</td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasQuarterly && (
        <div className="space-y-2">
          <h5 className="text-sm font-bold">{t('financeBudgetQuarterly')}</h5>
          <div className="table-wrapper table-scroll-sm">
            <table>
              <thead>
                <tr>
                  <th>{t('financeBudgetColPeriod')}</th>
                  <th>{t('financeBudgetColPlanned')}</th>
                  <th>{t('financeBudgetColExecuted')}</th>
                  <th>{t('financeBudgetColPercent')}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.quarterly.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{formatFinanceAmount(row.planned)}</td>
                    <td>{formatFinanceAmount(row.executed)}</td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
