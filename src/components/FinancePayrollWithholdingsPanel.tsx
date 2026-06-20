'use client';

import {
  assignmentMonthsAffected,
  createPayrollWithholdingAssignment,
  newWithholdingType,
  PAYROLL_WITHHOLDING_LEGAL_BASIS,
  PAYROLL_WITHHOLDING_PRESETS,
  removePayrollWithholdingAssignment,
  resolvePayrollWithholdings,
  sortPayrollWithholdingAssignments,
  upsertPayrollWithholdingAssignment,
} from '@/lib/finance-payroll-withholdings';
import { syncLedgersAfterWithholdingAssignmentChange } from '@/lib/finance-payroll-ledger';
import { rebuildBudgetMemorialJournalInFinance } from '@/lib/payroll-accounting';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { activeEmployees } from '@/lib/staff-timesheet';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import {
  OrganizationSectionContent,
  PayrollWithholdingAssignment,
  PayrollWithholdingTiming,
  PayrollWithholdingType,
  StaffEmployee,
} from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function employeeLabel(employee: StaffEmployee) {
  const parts = [employee.fullName];
  if (employee.position) parts.push(`— ${employee.position}`);
  if (employee.personnelNumber) parts.push(`(${employee.personnelNumber})`);
  return parts.join(' ');
}

export default function FinancePayrollWithholdingsPanel({
  organizationId,
  financeContent,
  staffContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const { canEdit } = useOrganizationAccess();
  const [types, setTypes] = useState<PayrollWithholdingType[]>(
    () => financeContent.payrollWithholdingTypes ?? []
  );
  const [assignments, setAssignments] = useState<PayrollWithholdingAssignment[]>(
    () => financeContent.payrollWithholdingAssignments ?? []
  );
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<PayrollWithholdingAssignment>(
    createPayrollWithholdingAssignment
  );
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  const employees = useMemo(
    () => activeEmployees(staffContent?.employees),
    [staffContent?.employees]
  );
  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );
  const enabledTypes = useMemo(
    () => resolvePayrollWithholdings({ payrollWithholdingTypes: types }),
    [types]
  );
  const sortedAssignments = useMemo(
    () => sortPayrollWithholdingAssignments(assignments),
    [assignments]
  );

  async function persistFinance(payload: OrganizationSectionContent) {
    setSaving(true);
    setError('');
    setSaveNotice('');
    try {
      const saved = await updateOrganizationSection(organizationId, 'finance', payload);
      if (!saved) {
        setError(t('sectionSaveError'));
        return null;
      }
      onUpdate(saved);
      setTypes(saved.payrollWithholdingTypes ?? []);
      setAssignments(saved.payrollWithholdingAssignments ?? []);
      return saved;
    } catch {
      setError(t('sectionSaveError'));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function persistTypes(nextTypes: PayrollWithholdingType[]) {
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      payrollWithholdingTypes: nextTypes,
    };
    const saved = await persistFinance(payload);
    if (saved) setTypes(saved.payrollWithholdingTypes ?? nextTypes);
  }

  function updateType(id: string, patch: Partial<PayrollWithholdingType>) {
    const next = types.map((item) => (item.id === id ? { ...item, ...patch } : item));
    setTypes(next);
    void persistTypes(next);
  }

  function removeType(id: string) {
    const next = types.filter((item) => item.id !== id);
    setTypes(next);
    void persistTypes(next);
  }

  function addType(preset?: (typeof PAYROLL_WITHHOLDING_PRESETS)[number]) {
    const nextType = preset
      ? newWithholdingType(preset.name, preset.timing, preset.legalBasis)
      : newWithholdingType(t('payrollWithholdingsNewName'), 'post_tax', PAYROLL_WITHHOLDING_LEGAL_BASIS.laborCode);
    const next = [...types, nextType];
    setTypes(next);
    void persistTypes(next);
  }

  function timingLabel(timing: PayrollWithholdingTiming): string {
    return timing === 'pre_tax'
      ? t('payrollWithholdingsTimingPreTax')
      : t('payrollWithholdingsTimingPostTax');
  }

  function startNewAssignment() {
    const draft = createPayrollWithholdingAssignment();
    if (enabledTypes[0]) draft.withholdingTypeId = enabledTypes[0].id;
    setAssignmentDraft(draft);
    setSelectedAssignmentId(null);
    setEditingAssignment(true);
    setSaveNotice('');
    setError('');
  }

  function selectAssignment(item: PayrollWithholdingAssignment) {
    setSelectedAssignmentId(item.id);
    setAssignmentDraft({ ...item });
    setEditingAssignment(false);
    setSaveNotice('');
    setError('');
  }

  function applyEmployee(employeeId: string) {
    setAssignmentDraft((current) => ({ ...current, employeeId }));
  }

  async function persistAssignment(nextAssignment: PayrollWithholdingAssignment) {
    const nextAssignments = upsertPayrollWithholdingAssignment(assignments, nextAssignment);
    const ledgerMonths = (financeContent.payrollLedgers ?? []).map((ledger) => ledger.month);
    const months = assignmentMonthsAffected(nextAssignment, ledgerMonths);
    let payrollLedgers = financeContent.payrollLedgers;

    if (staffContent && months.length > 0) {
      payrollLedgers = syncLedgersAfterWithholdingAssignmentChange(
        financeContent.payrollLedgers,
        nextAssignments,
        staffContent,
        months,
        { ...financeContent, payrollWithholdingAssignments: nextAssignments },
        organizationId
      );
    }

    let payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      payrollWithholdingAssignments: nextAssignments,
      payrollLedgers,
    };

    if (staffContent) {
      payload = rebuildBudgetMemorialJournalInFinance(payload, staffContent);
    }

    const saved = await persistFinance(payload);
    if (!saved) return false;

    setSelectedAssignmentId(nextAssignment.id);
    setAssignmentDraft(nextAssignment);
    setEditingAssignment(false);
    if (months.length > 0) {
      setSaveNotice(t('payrollWithholdingsAssignmentSavedMonths', { months: months.join(', ') }));
    } else {
      setSaveNotice(t('payrollWithholdingsAssignmentSaved'));
    }
    return true;
  }

  async function handleSaveAssignment() {
    if (!assignmentDraft.employeeId) {
      setError(t('laborLeaveEmployeeRequired'));
      return;
    }
    if (!assignmentDraft.withholdingTypeId) {
      setError(t('payrollWithholdingsTypeRequired'));
      return;
    }
    if (!assignmentDraft.amount.trim()) {
      setError(t('payrollWithholdingsAmountRequired'));
      return;
    }
    if (!assignmentDraft.effectiveFrom) {
      setError(t('payrollWithholdingsEffectiveFromRequired'));
      return;
    }
    if (
      assignmentDraft.effectiveTo &&
      assignmentDraft.effectiveTo < assignmentDraft.effectiveFrom
    ) {
      setError(t('payrollWithholdingsInvalidPeriod'));
      return;
    }

    await persistAssignment({
      ...assignmentDraft,
      documentRef: assignmentDraft.documentRef?.trim() || undefined,
      effectiveTo: assignmentDraft.effectiveTo?.trim() || undefined,
    });
  }

  async function handleDeleteAssignment() {
    if (!selectedAssignmentId || !confirm(t('confirmDeletePayrollWithholdingAssignment'))) return;

    const deleted = assignments.find((item) => item.id === selectedAssignmentId);
    const nextAssignments = removePayrollWithholdingAssignment(assignments, selectedAssignmentId);
    const ledgerMonths = (financeContent.payrollLedgers ?? []).map((ledger) => ledger.month);
    const months = deleted ? assignmentMonthsAffected(deleted, ledgerMonths) : [];
    let payrollLedgers = financeContent.payrollLedgers;

    if (staffContent && months.length > 0) {
      payrollLedgers = syncLedgersAfterWithholdingAssignmentChange(
        financeContent.payrollLedgers,
        nextAssignments,
        staffContent,
        months,
        { ...financeContent, payrollWithholdingAssignments: nextAssignments },
        organizationId
      );
    }

    let payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      payrollWithholdingAssignments: nextAssignments,
      payrollLedgers,
    };
    if (staffContent) {
      payload = rebuildBudgetMemorialJournalInFinance(payload, staffContent);
    }

    const saved = await persistFinance(payload);
    if (!saved) return;

    setSelectedAssignmentId(null);
    setAssignmentDraft(createPayrollWithholdingAssignment());
    setEditingAssignment(false);
    setSaveNotice(t('payrollWithholdingsAssignmentDeleted'));
  }

  return (
    <section className="space-y-8">
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
      {saveNotice && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {saveNotice}
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
        {t('payrollWithholdingsEnabledCount', { count: enabledTypes.length })}
      </p>

      <div className="space-y-4 border-t border-[var(--border)] pt-6">
        <div>
          <h3 className="text-base font-semibold">{t('payrollWithholdingsAssignmentsTitle')}</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t('payrollWithholdingsAssignmentsSubtitle')}
          </p>
        </div>

        {!staffContent || employees.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
            {t('payrollWithholdingsNoEmployees')}
          </p>
        ) : enabledTypes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
            {t('payrollWithholdingsNoTypesForAssignment')}
          </p>
        ) : (
          <>
            {sortedAssignments.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="data-table min-w-[48rem] text-xs">
                  <thead>
                    <tr>
                      <th>{t('laborLeaveEmployee')}</th>
                      <th>{t('payrollWithholdingsColName')}</th>
                      <th>{t('payrollWithholdingsColTiming')}</th>
                      <th>{t('allowanceColAmount')}</th>
                      <th>{t('payrollWithholdingsColPeriod')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAssignments.map((item) => {
                      const employee = employeeMap.get(item.employeeId);
                      const type = types.find((entry) => entry.id === item.withholdingTypeId);
                      const selected = item.id === selectedAssignmentId;
                      return (
                        <tr
                          key={item.id}
                          className={selected ? 'bg-[var(--bg-input)]/40' : 'cursor-pointer hover:bg-[var(--bg-input)]/20'}
                          onClick={() => selectAssignment(item)}
                        >
                          <td>{employee ? employeeLabel(employee) : '—'}</td>
                          <td>{type?.name ?? '—'}</td>
                          <td>{type ? timingLabel(type.timing) : '—'}</td>
                          <td>{item.amount}</td>
                          <td>
                            {item.effectiveFrom}
                            {item.effectiveTo ? ` — ${item.effectiveTo}` : ` — ${t('payrollWithholdingsOpenEnded')}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {canEdit && (editingAssignment || selectedAssignmentId) && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/10 p-4 space-y-3">
                <div>
                  <label className="field-label">{t('laborLeaveEmployee')}</label>
                  <select
                    value={assignmentDraft.employeeId}
                    onChange={(event) => applyEmployee(event.target.value)}
                    className="input-field text-sm"
                    disabled={saving || !editingAssignment}
                  >
                    <option value="">{t('positionHandoverSelectEmployee')}</option>
                    {employees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {employeeLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="field-label">{t('payrollWithholdingsColName')}</label>
                    <select
                      value={assignmentDraft.withholdingTypeId}
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({
                          ...current,
                          withholdingTypeId: event.target.value,
                        }))
                      }
                      className="input-field text-sm"
                      disabled={saving || !editingAssignment}
                    >
                      <option value="">{t('payrollWithholdingsSelectType')}</option>
                      {enabledTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({timingLabel(item.timing)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">{t('allowanceColAmount')}</label>
                    <input
                      value={assignmentDraft.amount}
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({ ...current, amount: event.target.value }))
                      }
                      className="input-field text-sm"
                      placeholder="0,00"
                      disabled={saving || !editingAssignment}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="field-label">{t('payrollWithholdingsEffectiveFrom')}</label>
                    <input
                      type="month"
                      value={assignmentDraft.effectiveFrom}
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({
                          ...current,
                          effectiveFrom: event.target.value,
                        }))
                      }
                      className="input-field text-sm"
                      disabled={saving || !editingAssignment}
                    />
                  </div>
                  <div>
                    <label className="field-label">{t('payrollWithholdingsEffectiveTo')}</label>
                    <input
                      type="month"
                      value={assignmentDraft.effectiveTo ?? ''}
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({
                          ...current,
                          effectiveTo: event.target.value,
                        }))
                      }
                      className="input-field text-sm"
                      disabled={saving || !editingAssignment}
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">{t('payrollWithholdingsDocumentRef')}</label>
                  <input
                    value={assignmentDraft.documentRef ?? ''}
                    onChange={(event) =>
                      setAssignmentDraft((current) => ({
                        ...current,
                        documentRef: event.target.value,
                      }))
                    }
                    className="input-field text-sm"
                    placeholder={t('payrollWithholdingsDocumentRefPlaceholder')}
                    disabled={saving || !editingAssignment}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {editingAssignment && (
                    <button
                      type="button"
                      onClick={() => void handleSaveAssignment()}
                      className="btn-primary text-xs"
                      disabled={saving}
                    >
                      {t('save')}
                    </button>
                  )}
                  {selectedAssignmentId && !editingAssignment && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingAssignment(true)}
                        className="btn-secondary text-xs"
                        disabled={saving}
                      >
                        {t('edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAssignment()}
                        className="btn-secondary text-xs text-red-400"
                        disabled={saving}
                      >
                        {t('sickLeaveDelete')}
                      </button>
                    </>
                  )}
                  {editingAssignment && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAssignment(false);
                        setSelectedAssignmentId(null);
                        setAssignmentDraft(createPayrollWithholdingAssignment());
                      }}
                      className="btn-secondary text-xs"
                      disabled={saving}
                    >
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {canEdit && !editingAssignment && !selectedAssignmentId && (
              <button
                type="button"
                onClick={startNewAssignment}
                className="btn-secondary text-xs"
                disabled={saving}
              >
                + {t('payrollWithholdingsAddAssignment')}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
