'use client';

import { FinanceSectionId } from '@/lib/finance-section-nav';
import { useTranslations } from 'next-intl';

const links: { id: FinanceSectionId; labelKey: string }[] = [
  { id: 'finance-stats', labelKey: 'financeNavStats' },
  { id: 'finance-budget', labelKey: 'financeNavBudget' },
  { id: 'finance-payroll', labelKey: 'financeNavPayroll' },
  { id: 'finance-position-handover', labelKey: 'financeNavPositionHandover' },
  { id: 'finance-payroll-ledger', labelKey: 'financeNavPayrollLedger' },
  { id: 'finance-bank-payment', labelKey: 'financeNavBankPayment' },
  { id: 'finance-labor-leave', labelKey: 'financeNavLaborLeave' },
  { id: 'finance-maternity-leave', labelKey: 'financeNavMaternityLeave' },
  { id: 'finance-sick-leave', labelKey: 'financeNavSickLeave' },
  { id: 'finance-contacts', labelKey: 'financeNavContacts' },
];

type Props = {
  activeId: FinanceSectionId;
  onSelect: (id: FinanceSectionId) => void;
};

export default function FinanceSectionNav({ activeId, onSelect }: Props) {
  const t = useTranslations();

  return (
    <nav className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-1">
      {links.map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            activeId === id
              ? 'bg-[var(--accent)]/20 text-[var(--text)]'
              : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
          }`}
        >
          {t(labelKey)}
        </button>
      ))}
    </nav>
  );
}
