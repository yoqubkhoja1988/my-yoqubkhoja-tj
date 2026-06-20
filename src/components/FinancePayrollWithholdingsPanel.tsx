'use client';

import {
  newWithholdingType,
  PAYROLL_WITHHOLDING_LEGAL_BASIS,
  PAYROLL_WITHHOLDING_PRESETS,
  resolvePayrollWithholdings,
} from '@/lib/finance-payroll-withholdings';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import {
  OrganizationSectionContent,
  PayrollWithholdingTiming,
  PayrollWithholdingType,
} from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Props = {
  organizationId: string;
  financeContent: OrganizationSectionContent;
  onUpdate: (content: OrganizationSectionContent) => void;
};

export default function FinancePayrollWithholdingsPanel({
  organizationId,
  financeContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const { canEdit } = useOrganizationAccess();
  const [types, setTypes] = useState<PayrollWithholdingType[]>(
    () => financeContent.payrollWithholdingTypes ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const enabledCount = resolvePayrollWithholdings({ payrollWithholdingTypes: types }).length;

  async function persist(nextTypes: PayrollWithholdingType[]) {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      payrollWithholdingTypes: nextTypes,
    };
    try {
      const saved = await updateOrganizationSection(organizationId, 'finance', payload);
      if (!saved) {
        setError(t('sectionSaveError'));
        return;
      }
      onUpdate(saved);
      setTypes(saved.payrollWithholdingTypes ?? nextTypes);
    } catch {
      setError(t('sectionSaveError'));
    } finally {
      setSaving(false);
    }
  }

  function updateType(id: string, patch: Partial<PayrollWithholdingType>) {
    const next = types.map((item) => (item.id === id ? { ...item, ...patch } : item));
    setTypes(next);
    void persist(next);
  }

  function removeType(id: string) {
    const next = types.filter((item) => item.id !== id);
    setTypes(next);
    void persist(next);
  }

  function addType(preset?: (typeof PAYROLL_WITHHOLDING_PRESETS)[number]) {
    const nextType = preset
      ? newWithholdingType(preset.name, preset.timing, preset.legalBasis)
      : newWithholdingType(t('payrollWithholdingsNewName'), 'post_tax', PAYROLL_WITHHOLDING_LEGAL_BASIS.laborCode);
    const next = [...types, nextType];
    setTypes(next);
    void persist(next);
  }

  function timingLabel(timing: PayrollWithholdingTiming): string {
    return timing === 'pre_tax'
      ? t('payrollWithholdingsTimingPreTax')
      : t('payrollWithholdingsTimingPostTax');
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('payrollWithholdingsTitle')}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          {t('payrollWithholdingsSubtitle')}
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
          {PAYROLL_WITHHOLDING_LEGAL_BASIS.taxCode}. {PAYROLL_WITHHOLDING_LEGAL_BASIS.laborCode}.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/20 p-3 text-xs">
          <p className="font-medium">{t('payrollWithholdingsTimingPreTax')}</p>
          <p className="mt-1 text-[var(--text-muted)]">{t('payrollWithholdingsPreTaxHint')}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/20 p-3 text-xs">
          <p className="font-medium">{t('payrollWithholdingsTimingPostTax')}</p>
          <p className="mt-1 text-[var(--text-muted)]">{t('payrollWithholdingsPostTaxHint')}</p>
        </div>
      </div>

      {types.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
          <p>{t('payrollWithholdingsEmpty')}</p>
          {canEdit && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => addType()} className="btn-secondary text-xs">
                + {t('payrollWithholdingsAdd')}
              </button>
              {PAYROLL_WITHHOLDING_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => addType(preset)}
                  className="btn-secondary text-xs"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="data-table min-w-[40rem] text-xs">
            <thead>
              <tr>
                <th>{t('payrollWithholdingsColName')}</th>
                <th>{t('payrollWithholdingsColTiming')}</th>
                <th>{t('payrollWithholdingsColLegalBasis')}</th>
                <th>{t('payrollWithholdingsColEnabled')}</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {types.map((item) => (
                <tr key={item.id}>
                  <td>
                    {canEdit ? (
                      <input
                        value={item.name}
                        onChange={(event) => updateType(item.id, { name: event.target.value })}
                        className="input-field w-full text-xs"
                        disabled={saving}
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td>
                    {canEdit ? (
                      <select
                        value={item.timing}
                        onChange={(event) =>
                          updateType(item.id, {
                            timing: event.target.value as PayrollWithholdingTiming,
                          })
                        }
                        className="input-field text-xs"
                        disabled={saving}
                      >
                        <option value="pre_tax">{t('payrollWithholdingsTimingPreTax')}</option>
                        <option value="post_tax">{t('payrollWithholdingsTimingPostTax')}</option>
                      </select>
                    ) : (
                      timingLabel(item.timing)
                    )}
                  </td>
                  <td className="min-w-[14rem]">
                    {canEdit ? (
                      <input
                        value={item.legalBasis}
                        onChange={(event) =>
                          updateType(item.id, { legalBasis: event.target.value })
                        }
                        className="input-field w-full text-xs"
                        disabled={saving}
                      />
                    ) : (
                      <span className="text-[var(--text-muted)]">{item.legalBasis}</span>
                    )}
                  </td>
                  <td className="text-center">
                    {canEdit ? (
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) =>
                          updateType(item.id, { enabled: event.target.checked })
                        }
                        disabled={saving}
                      />
                    ) : item.enabled ? (
                      '✓'
                    ) : (
                      '—'
                    )}
                  </td>
                  {canEdit && (
                    <td>
                      <button
                        type="button"
                        onClick={() => removeType(item.id)}
                        className="text-red-400 hover:underline"
                        disabled={saving}
                      >
                        {t('sickLeaveDelete')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && types.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addType()} className="btn-secondary text-xs" disabled={saving}>
            + {t('payrollWithholdingsAdd')}
          </button>
        </div>
      )}

      <p className="text-xs text-[var(--text-muted)]">
        {t('payrollWithholdingsEnabledCount', { count: enabledCount })}
      </p>
    </section>
  );
}
