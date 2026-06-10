'use client';

import { StaffAnalytics } from '@/lib/staff-analytics';
import { useTranslations } from 'next-intl';

type Props = {
  analytics: StaffAnalytics;
};

export default function StaffOverviewStats({ analytics }: Props) {
  const t = useTranslations();

  const items = [
    { label: t('staffStatQuota'), value: analytics.totalQuota, color: 'text-blue-400' },
    { label: t('staffStatRegistered'), value: analytics.totalActive, color: 'text-emerald-400' },
    { label: t('staffStatVacant'), value: analytics.totalVacant, color: 'text-amber-400' },
    {
      label: t('staffStatMonthlyFund'),
      value: analytics.monthlyFund ? `${analytics.monthlyFund} ${t('staffCurrency')}` : '—',
      color: 'text-violet-400',
      small: true,
    },
  ];

  return (
    <div id="staff-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
