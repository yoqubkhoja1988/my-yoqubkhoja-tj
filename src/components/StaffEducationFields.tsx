'use client';

import { EMPLOYEE_SCHOOLING_LEVELS } from '@/lib/staff-schooling';
import { EmployeeSchoolingLevel } from '@/types/organization-section';
import { useTranslations } from 'next-intl';

type Props = {
  value?: EmployeeSchoolingLevel;
  onChange: (value: EmployeeSchoolingLevel | undefined) => void;
};

export default function StaffEducationFields({ value, onChange }: Props) {
  const t = useTranslations();

  return (
    <div>
      <label className="field-label">{t('employeeSchooling')}</label>
      <select
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value as EmployeeSchoolingLevel | '';
          onChange(next || undefined);
        }}
        className="input-field"
      >
        <option value="">{t('employeeSchoolingPlaceholder')}</option>
        {EMPLOYEE_SCHOOLING_LEVELS.map((level) => (
          <option key={level} value={level}>
            {t(`employeeSchooling_${level}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
