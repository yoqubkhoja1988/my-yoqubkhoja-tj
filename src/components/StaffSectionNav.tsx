'use client';

import { StaffSectionId } from '@/lib/staff-section-nav';
import { useTranslations } from 'next-intl';

const links: { id: StaffSectionId; labelKey: string }[] = [
  { id: 'staff-stats', labelKey: 'staffNavStats' },
  { id: 'staff-schedule', labelKey: 'staffNavSchedule' },
  { id: 'staff-vacancy', labelKey: 'staffNavVacancy' },
  { id: 'staff-registry', labelKey: 'staffNavRegistry' },
  { id: 'staff-timesheet', labelKey: 'staffNavTimesheet' },
];

type Props = {
  activeId: StaffSectionId;
  onSelect: (id: StaffSectionId) => void;
};

export default function StaffSectionNav({ activeId, onSelect }: Props) {
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
