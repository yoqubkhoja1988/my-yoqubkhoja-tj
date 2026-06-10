'use client';

import { FinanceAnalytics, formatFinanceAmount } from '@/lib/finance-analytics';
import { useTranslations } from 'next-intl';

type Props = {
  analytics: FinanceAnalytics;
};

export default function FinanceOverviewStats({ analytics }: Props) {
  const t = useTranslations();

  const items = [
    {
      label: t('financeStatBudget'),
      value: formatFinanceAmount(analytics.annualBudget),
      color: 'text-blue-400',
    },
    {
      label: t('financeStatExecuted'),
      value: formatFinanceAmount(analytics.executed),
      color: 'text-emerald-400',
    },
    {
      label: t('financeStatRemaining'),
      value: formatFinanceAmount(analytics.remaining),
      color: 'text-amber-400',
    },
    {
      label: t('financeStatExecution'),
      value: analytics.annualBudget > 0 ? `${analytics.executionPercent}%` : '—',
      color: 'text-violet-400',
    },
    {
      label: t('financeStatMonthlyPayroll'),
      value: formatFinanceAmount(analytics.monthlyPayroll),
      color: 'text-cyan-400',
      small: true,
    },
    {
      label: t('financeStatAnnualPayroll'),
      value: formatFinanceAmount(analytics.annualPayroll),
      color: 'text-pink-400',
      small: true,
    },
  ];

  return (
    <div id="finance-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{item.label}</p>
          <p
            className={`mt-0.5 font-bold ${item.small ? 'text-sm' : 'text-xl'} ${item.color}`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
