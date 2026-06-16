'use client';

import {
  calculateWageScale,
  EDUCATION_LEVELS,
  EducationLevel,
  ExtraDuty,
  formatWageAmount,
  getDefaultStudentBracket,
  getEducationLevelsForOrganization,
  getEducatorDutySalary,
  normalizeEducationLevel,
  getManagementSalary,
  getMedicalCategorySalary,
  getTeachingScalePreview,
  isKindergartenDirectorWithoutSalary,
  KINDERGARTEN_WAGE_SCALE_GROUPS,
  MedicalCategory,
  STUDENT_BRACKETS,
  usesEducationLevel,
  usesPreschoolWageScales,
  WAGE_SCALE_GROUPS,
  WageScaleGroup,
} from '@/lib/preschool-wage-scales';
import { EmployeeWageScale } from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type Props = {
  organizationId: string;
  value: EmployeeWageScale;
  onChange: (value: EmployeeWageScale) => void;
};

const EXTRA_DUTIES: ExtraDuty[] = [
  'class_leadership',
  'notebook_check',
  'cabinet_management',
];

const MEDICAL_CATEGORIES: MedicalCategory[] = [
  'none',
  'category_2',
  'category_1',
  'superior',
];

export default function PreschoolWageScaleFields({
  organizationId,
  value,
  onChange,
}: Props) {
  const t = useTranslations();
  const calculated = useMemo(
    () => calculateWageScale(value, organizationId),
    [value, organizationId]
  );
  const defaultBracket = getDefaultStudentBracket(organizationId);
  const educationLevels = getEducationLevelsForOrganization(organizationId);
  const groupOptions = usesPreschoolWageScales(organizationId)
    ? KINDERGARTEN_WAGE_SCALE_GROUPS
    : WAGE_SCALE_GROUPS;

  function update(patch: Partial<EmployeeWageScale>) {
    onChange(calculateWageScale({ ...value, ...patch }, organizationId));
  }

  function handleGroupChange(group: WageScaleGroup) {
    const patch: Partial<EmployeeWageScale> = { group };
    if (group === 'management') {
      patch.managementRole = value.managementRole ?? 'director';
      patch.studentBracket = value.studentBracket ?? defaultBracket;
    }
    if (group === 'educator-20h' || group === 'teacher-18h') {
      patch.educationLevel = value.educationLevel ?? 'higher_c1';
      patch.extraDuties = value.extraDuties ?? [];
    }
    if (group === 'medical') {
      patch.medicalCategory = value.medicalCategory ?? 'category_2';
    }
    if (group === 'auxiliary') {
      patch.auxiliaryRole = value.auxiliaryRole ?? 'standard';
    }
    update(patch);
  }

  function toggleExtraDuty(duty: ExtraDuty) {
    const current = value.extraDuties ?? [];
    const next = current.includes(duty)
      ? current.filter((item) => item !== duty)
      : [...current, duty];
    update({ extraDuties: next });
  }

  const activeGroup = value.group ?? 'educator-20h';
  const selectedLevel = normalizeEducationLevel(value.educationLevel, organizationId);
  const selectedEducatorSalary =
    activeGroup === 'educator-20h'
      ? getEducatorDutySalary(selectedLevel, organizationId, 'educator-20h')
      : null;

  function educationOptionLabel(level: EducationLevel): string {
    const salary = getEducatorDutySalary(level, organizationId, activeGroup);
    return `${t(`wageScaleEducation_${level}`)} — ${formatWageAmount(salary)} ${t('wageScaleSomoni')}`;
  }

  function selectEducationLevel(level: EducationLevel) {
    update({ educationLevel: level });
  }

  function medicalOptionLabel(category: MedicalCategory): string {
    return `${t(`wageScaleMedical_${category}`)} — ${formatWageAmount(getMedicalCategorySalary(category))} ${t('wageScaleSomoni')}`;
  }

  const teachingPreview =
    value.group === 'educator-20h' || value.group === 'teacher-18h'
      ? getTeachingScalePreview(
          value.group,
          normalizeEducationLevel(value.educationLevel, organizationId),
          organizationId
        )
      : null;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 p-3">
      <div>
        <p className="text-sm font-semibold">{t('wageScaleTitle')}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{t('wageScaleSubtitle')}</p>
      </div>

      <div>
        <label className="field-label">{t('wageScaleGroup')}</label>
        <select
          value={value.group ?? (usesPreschoolWageScales(organizationId) ? 'educator-20h' : 'management')}
          onChange={(e) => handleGroupChange(e.target.value as WageScaleGroup)}
          className="input-field"
        >
          {groupOptions.map((group) => (
            <option key={group} value={group}>
              {t(`wageScaleGroup_${group}`)}
            </option>
          ))}
        </select>
      </div>

      {value.group === 'management' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label">{t('wageScaleManagementRole')}</label>
            <select
              value={value.managementRole ?? 'director'}
              onChange={(e) =>
                update({
                  managementRole: e.target.value as EmployeeWageScale['managementRole'],
                })
              }
              className="input-field"
            >
              <option value="director">{t('wageScaleRole_director')}</option>
              <option value="deputy_education">
                {t('wageScaleRole_deputy_advisor')} —{' '}
                {formatWageAmount(
                  getManagementSalary(
                    'deputy_education',
                    value.studentBracket ?? defaultBracket,
                    organizationId
                  )
                )}{' '}
                {t('wageScaleSomoni')}
              </option>
            </select>
            {isKindergartenDirectorWithoutSalary(value, organizationId) && (
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                {t('wageScaleKindergartenDirectorNote')}
              </p>
            )}
          </div>
          <div>
            <label className="field-label">{t('wageScaleStudentBracket')}</label>
            <select
              value={value.studentBracket ?? defaultBracket}
              onChange={(e) =>
                update({
                  studentBracket: e.target.value as EmployeeWageScale['studentBracket'],
                })
              }
              className="input-field"
            >
              {STUDENT_BRACKETS.map((bracket) => (
                <option key={bracket} value={bracket}>
                  {t(`wageScaleBracket_${bracket}`)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {usesEducationLevel(value.group) && (
        <>
          <div>
            <label className="field-label">{t('wageScaleEducationLevel')}</label>
            <select
              value={selectedLevel}
              onChange={(e) =>
                selectEducationLevel(e.target.value as EducationLevel)
              }
              className="input-field"
            >
              {educationLevels.map((level) => (
                <option key={level} value={level}>
                  {educationOptionLabel(level)}
                </option>
              ))}
            </select>
            {selectedEducatorSalary !== null && (
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                {t('wageScaleSelectedEducationSalary')}:{' '}
                <span className="font-semibold text-[var(--text)]">
                  {formatWageAmount(selectedEducatorSalary)} {t('wageScaleSomoni')}
                </span>
              </p>
            )}
          </div>

          {activeGroup === 'educator-20h' && (
            <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/60">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                    <th className="px-2 py-1.5 font-medium">{t('wageScaleEducationLevel')}</th>
                    <th className="px-2 py-1.5 font-medium">{t('wageScaleDutySalary')}</th>
                  </tr>
                </thead>
                <tbody>
                  {educationLevels.map((level) => {
                    const salary = getEducatorDutySalary(level, organizationId, 'educator-20h');
                    const selected = selectedLevel === level;
                    return (
                      <tr
                        key={level}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectEducationLevel(level)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            selectEducationLevel(level);
                          }
                        }}
                        className={`cursor-pointer ${
                          selected
                            ? 'bg-[var(--accent)]/10 font-semibold'
                            : 'border-t border-[var(--border)]/50 hover:bg-[var(--bg-input)]/80'
                        }`}
                      >
                        <td className="px-2 py-1">{t(`wageScaleEducation_${level}`)}</td>
                        <td className="px-2 py-1 font-mono">
                          {formatWageAmount(salary)} {t('wageScaleSomoni')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {teachingPreview && value.group !== 'psychologist' && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/60 p-2 text-[11px]">
              <p className="mb-1 font-semibold">{t('wageScaleTeachingTable')}</p>
              <dl className="grid gap-1 sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--text-muted)]">{t('wageScaleWorkUnit')}</dt>
                  <dd>{formatWageAmount(teachingPreview.workUnit)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">{t('wageScaleHourly')}</dt>
                  <dd>{formatWageAmount(teachingPreview.hourly)}</dd>
                </div>
              </dl>
            </div>
          )}

          {(value.group === 'educator-20h' || value.group === 'teacher-18h') && (
            <div>
              <p className="field-label mb-2">{t('wageScaleExtraDuties')}</p>
              <div className="flex flex-wrap gap-2">
                {EXTRA_DUTIES.map((duty) => {
                  const checked = (value.extraDuties ?? []).includes(duty);
                  return (
                    <label
                      key={duty}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                        checked
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExtraDuty(duty)}
                        className="accent-[var(--accent)]"
                      />
                      {t(`wageScaleDuty_${duty}`)}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {value.group === 'medical' && (
        <div>
          <label className="field-label">{t('wageScaleMedicalCategory')}</label>
          <select
            value={value.medicalCategory ?? 'category_2'}
            onChange={(e) =>
              update({
                medicalCategory: e.target.value as EmployeeWageScale['medicalCategory'],
              })
            }
            className="input-field"
          >
            {MEDICAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {medicalOptionLabel(category)}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.group === 'auxiliary' && (
        <div>
          <label className="field-label">{t('wageScaleAuxiliaryRole')}</label>
          <select
            value={value.auxiliaryRole ?? 'standard'}
            onChange={(e) =>
              update({
                auxiliaryRole: e.target.value as EmployeeWageScale['auxiliaryRole'],
              })
            }
            className="input-field"
          >
            <option value="standard">
              {t('wageScaleAuxiliary_standard')} — {formatWageAmount(1387)} {t('wageScaleSomoni')}
            </option>
            <option value="accountant">
              {t('wageScaleAuxiliary_accountant')} — {formatWageAmount(1790.1)}{' '}
              {t('wageScaleSomoni')}
            </option>
          </select>
        </div>
      )}

      <div className="space-y-1 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-3 py-2">
        <div>
          <p className="text-[11px] text-[var(--text-muted)]">{t('wageScaleDutySalary')}</p>
          <p className="text-base font-bold">
            {calculated.baseSalary} {t('wageScaleSomoni')}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[var(--text-muted)]">{t('wageScaleCalculatedMonthly')}</p>
          <p className="text-lg font-bold">
            {calculated.calculatedMonthly} {t('wageScaleSomoni')}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {t('wageScaleMonthlyFormula', {
              dutySalary: calculated.baseSalary ?? '0,00',
              workUnitRate: value.workUnitRate?.trim() || '1',
              monthly: calculated.calculatedMonthly ?? '0,00',
            })}
          </p>
        </div>
        {(value.group === 'educator-20h' || value.group === 'teacher-18h') &&
          (value.extraDuties?.length ?? 0) > 0 && (
            <p className="text-[10px] text-[var(--text-muted)]">
              {t('wageScaleMonthlyWithExtrasNote')}
            </p>
          )}
        {calculated.hourlyRate && (
          <p className="text-[11px] text-[var(--text-muted)]">
            {t('wageScaleHourly')}: {calculated.hourlyRate} {t('wageScaleSomoni')}
          </p>
        )}
      </div>
    </div>
  );
}
