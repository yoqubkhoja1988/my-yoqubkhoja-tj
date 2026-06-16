'use client';

import { formatAppDate } from '@/lib/intl-locale';
import {
  nextProfessionalCycleDueDate,
  professionalCycleYears,
  resolveProfessionalCycleStatus,
} from '@/lib/staff-professional-development';
import {
  EmployeeProfessionalCycleRecord,
  EmployeeProfessionalDevelopment,
  ProfessionalCycleKind,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';

type Props = {
  value: EmployeeProfessionalDevelopment;
  onChange: (value: EmployeeProfessionalDevelopment) => void;
};

function cycleRecord(
  development: EmployeeProfessionalDevelopment,
  kind: ProfessionalCycleKind
): EmployeeProfessionalCycleRecord {
  return (
    (kind === 'specialization'
      ? development.specializationCycle
      : development.qualificationUpgradeCycle) ?? {}
  );
}

function patchCycle(
  development: EmployeeProfessionalDevelopment,
  kind: ProfessionalCycleKind,
  patch: EmployeeProfessionalCycleRecord
): EmployeeProfessionalDevelopment {
  const key =
    kind === 'specialization' ? 'specializationCycle' : 'qualificationUpgradeCycle';
  return { ...development, [key]: { ...cycleRecord(development, kind), ...patch } };
}

function statusClass(status: ReturnType<typeof resolveProfessionalCycleStatus>): string {
  if (status === 'overdue') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (status === 'due_soon') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (status === 'valid') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  return 'border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)]';
}

function CycleFields({
  kind,
  value,
  onChange,
}: {
  kind: ProfessionalCycleKind;
  value: EmployeeProfessionalDevelopment;
  onChange: (value: EmployeeProfessionalDevelopment) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const record = cycleRecord(value, kind);
  const years = professionalCycleYears(kind);
  const status = resolveProfessionalCycleStatus(record.lastCompletedAt, kind);
  const nextDue = nextProfessionalCycleDueDate(record.lastCompletedAt, kind);
  const titleKey =
    kind === 'specialization'
      ? 'employeeCyclePeriodSpecialization'
      : 'employeeCyclePeriodQualificationUpgrade';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold">{t(titleKey)}</h4>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            {t('employeeCyclePeriodYears', { years })}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass(status)}`}
        >
          {t(`employeeCycleStatus_${status}`)}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label">{t('employeeCycleLastCompleted')}</label>
          <input
            type="date"
            value={record.lastCompletedAt ?? ''}
            onChange={(event) =>
              onChange(patchCycle(value, kind, { lastCompletedAt: event.target.value }))
            }
            className="input-field"
          />
        </div>
        <div>
          <label className="field-label">{t('employeeCycleNextDue')}</label>
          <input
            value={
              nextDue
                ? formatAppDate(nextDue, locale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '—'
            }
            readOnly
            className="input-field cursor-default bg-[var(--bg-input)]/60"
          />
        </div>
        <div>
          <label className="field-label">{t('employeeCycleCertificateNo')}</label>
          <input
            value={record.certificateNo ?? ''}
            onChange={(event) =>
              onChange(patchCycle(value, kind, { certificateNo: event.target.value }))
            }
            className="input-field"
          />
        </div>
        <div>
          <label className="field-label">{t('employeeCycleProvider')}</label>
          <input
            value={record.provider ?? ''}
            onChange={(event) =>
              onChange(patchCycle(value, kind, { provider: event.target.value }))
            }
            placeholder={t('employeeCycleProviderPlaceholder')}
            className="input-field"
          />
        </div>
      </div>
    </div>
  );
}

export default function StaffProfessionalDevelopmentFields({ value, onChange }: Props) {
  const t = useTranslations();

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-4">
      <div>
        <p className="text-sm font-bold">{t('employeeProfessionalDevelopmentSection')}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
          {t('employeeProfessionalDevelopmentLegalHint')}
        </p>
      </div>

      <CycleFields kind="specialization" value={value} onChange={onChange} />
      <CycleFields kind="qualification_upgrade" value={value} onChange={onChange} />
    </div>
  );
}

export function formatProfessionalCycleSummary(
  development: EmployeeProfessionalDevelopment | undefined,
  kind: ProfessionalCycleKind,
  formatDate: (iso: string) => string,
  labels: {
    missing: string;
    validUntil: (date: string) => string;
    dueSoon: (date: string) => string;
    overdue: (date: string) => string;
  }
): string {
  const record =
    kind === 'specialization'
      ? development?.specializationCycle
      : development?.qualificationUpgradeCycle;
  const status = resolveProfessionalCycleStatus(record?.lastCompletedAt, kind);
  const nextDue = nextProfessionalCycleDueDate(record?.lastCompletedAt, kind);

  if (status === 'missing' || !nextDue) return labels.missing;

  const formatted = formatDate(nextDue);
  if (status === 'overdue') return labels.overdue(formatted);
  if (status === 'due_soon') return labels.dueSoon(formatted);
  return labels.validUntil(formatted);
}
