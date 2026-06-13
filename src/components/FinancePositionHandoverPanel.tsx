'use client';

import { formatAppDate } from '@/lib/intl-locale';
import {
  calcHandoverAllowanceBreakdown,
  findPositionDutySalary,
} from '@/lib/finance-payroll-ledger';
import {
  createPositionHandover,
  handoverMonthKey,
  isVacantHandoverFrom,
  parseVacantHandoverFrom,
  removePositionHandover,
  sortPositionHandovers,
  syncLedgersAfterHandoverChange,
  upsertPositionHandover,
  vacantHandoverFromId,
} from '@/lib/finance-position-handover';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { formatAmount } from '@/lib/staff-table-calc';
import { updateOrganizationSection } from '@/lib/organization-sections';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { printDocument } from '@/lib/print-document';
import { analyzeStaffing } from '@/lib/staff-analytics';
import {
  extractStaffingOptions,
  getPositionsForDepartment,
} from '@/lib/staff-staffing-options';
import { activeEmployees } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import {
  OrganizationSectionContent,
  PositionHandover,
  StaffEmployee,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  onHandoverSaved?: (month: string) => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function employeeLabel(employee: StaffEmployee) {
  const parts = [employee.fullName];
  if (employee.position) parts.push(`— ${employee.position}`);
  if (employee.personnelNumber) parts.push(`(${employee.personnelNumber})`);
  return parts.join(' ');
}

export default function FinancePositionHandoverPanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onHandoverSaved,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { organizationName: reportOrganizationName } = useOrganizationReportHeader();
  const directorSignatureLabel = getDirectorSignatureLabel(organizationId);
  const { canEdit } = useOrganizationAccess();
  const employees = useMemo(
    () => activeEmployees(staffContent?.employees),
    [staffContent?.employees]
  );
  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );
  const staffingDepartments = useMemo(
    () => extractStaffingOptions(staffContent?.tables),
    [staffContent?.tables]
  );
  const vacantSlots = useMemo(() => {
    if (!staffContent) return [];
    return analyzeStaffing(staffContent).slots.filter((slot) => slot.vacant > 0);
  }, [staffContent]);

  const savedHandovers = useMemo(
    () => sortPositionHandovers(financeContent.positionHandovers),
    [financeContent.positionHandovers]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PositionHandover>(createPositionHandover());
  const departmentOptions = useMemo(() => {
    const labels = staffingDepartments.map((item) => item.label);
    if (draft.department && !labels.includes(draft.department)) {
      return [...labels, draft.department];
    }
    return labels;
  }, [staffingDepartments, draft.department]);
  const positionOptions = useMemo(() => {
    const fromStaffing = getPositionsForDepartment(staffingDepartments, draft.department);
    if (draft.position && !fromStaffing.includes(draft.position)) {
      return [...fromStaffing, draft.position];
    }
    return fromStaffing;
  }, [staffingDepartments, draft.department, draft.position]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    if (editing && !selectedId) return;
    if (selectedId && savedHandovers.some((item) => item.id === selectedId)) return;
    if (savedHandovers.length > 0) {
      setSelectedId(savedHandovers[0].id);
      setDraft(savedHandovers[0]);
      setEditing(false);
      return;
    }
    setSelectedId(null);
    setDraft({
      ...createPositionHandover(),
      reason: t('positionHandoverDefaultReason'),
      duties: t('positionHandoverDefaultDuties'),
    });
    setEditing(true);
  }, [savedHandovers, selectedId, editing, t]);

  function patch<K extends keyof PositionHandover>(field: K, value: PositionHandover[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function applyFrom(value: string) {
    const vacant = parseVacantHandoverFrom(value);
    if (vacant) {
      setDraft((current) => ({
        ...current,
        fromEmployeeId: value,
        department: vacant.department,
        position: vacant.position,
      }));
      return;
    }

    const employee = employeeMap.get(value);
    setDraft((current) => ({
      ...current,
      fromEmployeeId: value,
      ...(employee
        ? {
            department: employee.department ?? current.department,
            position: employee.position ?? current.position,
          }
        : {}),
    }));
  }

  function applyTo(employeeId: string) {
    setDraft((current) => ({ ...current, toEmployeeId: employeeId }));
  }

  function applyDepartment(value: string) {
    setDraft((current) => {
      const positions = getPositionsForDepartment(staffingDepartments, value);
      return {
        ...current,
        department: value,
        position: positions.includes(current.position) ? current.position : '',
      };
    });
  }

  function resolveFromLabel(fromEmployeeId: string) {
    const employee = employeeMap.get(fromEmployeeId);
    if (employee) return employee.fullName;
    const vacant = parseVacantHandoverFrom(fromEmployeeId);
    if (vacant) return `${vacant.position} (${t('staffVacant')})`;
    return '—';
  }

  function monthsToSyncHandover(
    nextHandover: PositionHandover,
    previousHandover?: PositionHandover
  ) {
    const months = new Set<string>([handoverMonthKey(nextHandover.effectiveDate)]);
    if (previousHandover) {
      months.add(handoverMonthKey(previousHandover.effectiveDate));
    }
    return [...months];
  }

  async function persist(nextHandover: PositionHandover) {
    setSaving(true);
    setError('');

    const previousHandover = financeContent.positionHandovers?.find(
      (item) => item.id === nextHandover.id
    );
    const nextHandovers = upsertPositionHandover(
      financeContent.positionHandovers,
      nextHandover
    );
    const payrollLedgers = staffContent
      ? syncLedgersAfterHandoverChange(
          financeContent.payrollLedgers,
          nextHandovers,
          staffContent,
          monthsToSyncHandover(nextHandover, previousHandover),
          financeContent.laborLeaves,
          organizationId
        )
      : financeContent.payrollLedgers;

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      positionHandovers: nextHandovers,
      payrollLedgers,
    };

    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return false;
    }

    onUpdate(saved);
    setSelectedId(nextHandover.id);
    setDraft(nextHandover);
    setEditing(false);
    if ((nextHandover.salaryHandoverPercent ?? 0) > 0) {
      const month = handoverMonthKey(nextHandover.effectiveDate);
      onHandoverSaved?.(month);
      setSaveNotice(t('positionHandoverSavedLedgerMonth', { month }));
    } else {
      setSaveNotice('');
    }
    return true;
  }

  async function handleSave() {
    if (!draft.fromEmployeeId || !draft.toEmployeeId) {
      setError(t('positionHandoverEmployeesRequired'));
      return;
    }
    if (
      !isVacantHandoverFrom(draft.fromEmployeeId) &&
      draft.fromEmployeeId === draft.toEmployeeId
    ) {
      setError(t('positionHandoverSameEmployee'));
      return;
    }
    const percent = draft.salaryHandoverPercent ?? 0;
    if (percent < 0 || percent > 100) {
      setError(t('positionHandoverPercentInvalid'));
      return;
    }
    await persist(draft);
  }

  async function handleDelete() {
    if (!selectedId || !confirm(t('confirmDeletePositionHandover'))) return;

    setSaving(true);
    const deleted = financeContent.positionHandovers?.find((item) => item.id === selectedId);
    const nextHandovers = removePositionHandover(financeContent.positionHandovers, selectedId);
    const payrollLedgers =
      staffContent && deleted
        ? syncLedgersAfterHandoverChange(
            financeContent.payrollLedgers,
            nextHandovers,
            staffContent,
            [handoverMonthKey(deleted.effectiveDate)],
            financeContent.laborLeaves,
            organizationId
          )
        : financeContent.payrollLedgers;
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      positionHandovers: nextHandovers,
      payrollLedgers,
    };
    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    const next = sortPositionHandovers(saved.positionHandovers);
    if (next.length > 0) {
      setSelectedId(next[0].id);
      setDraft(next[0]);
      setEditing(false);
    } else {
      setSelectedId(null);
      setDraft({
        ...createPositionHandover(),
        reason: t('positionHandoverDefaultReason'),
        duties: t('positionHandoverDefaultDuties'),
      });
      setEditing(true);
    }
  }

  function handleCreate() {
    setSelectedId(null);
    setDraft({
      ...createPositionHandover(),
      reason: t('positionHandoverDefaultReason'),
      duties: t('positionHandoverDefaultDuties'),
    });
    setEditing(true);
  }

  const fromEmployee = isVacantHandoverFrom(draft.fromEmployeeId)
    ? undefined
    : employeeMap.get(draft.fromEmployeeId);
  const fromVacant = parseVacantHandoverFrom(draft.fromEmployeeId);
  const toEmployee = employeeMap.get(draft.toEmployeeId);
  const canPrint = Boolean(draft.fromEmployeeId && toEmployee);
  const dutySalaryPreview = useMemo(() => {
    if (!staffContent || !draft.department || !draft.position) return null;
    return findPositionDutySalary(staffContent, draft.department, draft.position);
  }, [staffContent, draft.department, draft.position]);
  const handoverAllowanceBreakdown = useMemo(() => {
    if (!staffContent || !draft.toEmployeeId || !draft.effectiveDate) return null;
    return calcHandoverAllowanceBreakdown(
      draft,
      staffContent,
      draft.effectiveDate.slice(0, 7),
      draft.toEmployeeId
    );
  }, [staffContent, draft]);
  const preparedAt = draft.preparedAt
    ? formatAppDate(draft.preparedAt, locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';
  const effectiveDate = draft.effectiveDate
    ? formatAppDate(draft.effectiveDate, locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  return (
    <section id="finance-position-handover" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavPositionHandover')}</p>
          <h4 className="text-base font-bold">{t('positionHandoverTitle')}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedHandovers.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(event) => {
                const id = event.target.value;
                const saved = savedHandovers.find((item) => item.id === id);
                if (!saved) return;
                setSelectedId(id);
                setDraft(saved);
                setEditing(false);
              }}
              className="input-field w-auto text-xs"
              disabled={saving || editing}
            >
              {savedHandovers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.effectiveDate} — {resolveFromLabel(item.fromEmployeeId)} →{' '}
                  {employeeMap.get(item.toEmployeeId)?.fullName ?? '—'}
                </option>
              ))}
            </select>
          )}
          {canEdit && (
          <button
            type="button"
            onClick={handleCreate}
            className="btn-secondary text-xs"
            disabled={saving}
          >
            + {t('positionHandoverAdd')}
          </button>
          )}
          <button
            type="button"
            onClick={() => printDocument('finance-position-handover-document')}
            className="btn-primary text-xs"
            disabled={!canPrint}
          >
            🖨 {t('positionHandoverPrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-position-handover-document"
            filename={`voguzori-${draft.effectiveDate || 'hujjat'}`}
            disabled={!canPrint}
          />
          {canEdit &&
            (editing ? (
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary text-xs"
              disabled={saving || !staffContent}
            >
              {saving ? '...' : t('save')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary text-xs"
                disabled={saving}
              >
                {t('positionHandoverEdit')}
              </button>
              {selectedId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-danger text-xs"
                  disabled={saving}
                >
                  {t('positionHandoverDelete')}
                </button>
              )}
            </>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300 print:hidden">
          {error}
        </p>
      )}

      {saveNotice && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 print:hidden">
          {saveNotice}
        </p>
      )}

      {!staffContent ? (
        <p className="text-xs text-[var(--text-muted)]">{t('financePayrollNoStaff')}</p>
      ) : employees.length < 1 ? (
        <p className="text-xs text-[var(--text-muted)]">{t('positionHandoverNeedEmployees')}</p>
      ) : (
        <>
          {editing && (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-4 print:hidden">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="field-label">{t('positionHandoverFrom')}</label>
                  <select
                    value={draft.fromEmployeeId}
                    onChange={(event) => applyFrom(event.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">{t('positionHandoverSelectEmployee')}</option>
                    <optgroup label={t('positionHandoverFromEmployees')}>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employeeLabel(employee)}
                        </option>
                      ))}
                    </optgroup>
                    {vacantSlots.length > 0 && (
                      <optgroup label={t('positionHandoverFromVacant')}>
                        {vacantSlots.map((slot) => {
                          const id = vacantHandoverFromId(slot.department, slot.position);
                          return (
                            <option key={id} value={id}>
                              {slot.position} — {slot.department} ({t('staffVacant')})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div>
                  <label className="field-label">{t('positionHandoverTo')}</label>
                  <select
                    value={draft.toEmployeeId}
                    onChange={(event) => applyTo(event.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">{t('positionHandoverSelectEmployee')}</option>
                    {employees
                      .filter(
                        (employee) =>
                          isVacantHandoverFrom(draft.fromEmployeeId) ||
                          employee.id !== draft.fromEmployeeId
                      )
                      .map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employeeLabel(employee)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="field-label">{t('employeeDepartment')}</label>
                  <select
                    value={draft.department}
                    onChange={(event) => applyDepartment(event.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">{t('positionHandoverSelectDepartment')}</option>
                    {departmentOptions.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">{t('employeePosition')}</label>
                  <select
                    value={draft.position}
                    onChange={(event) => patch('position', event.target.value)}
                    className="input-field text-sm"
                    disabled={!draft.department && positionOptions.length === 0}
                  >
                    <option value="">{t('positionHandoverSelectPosition')}</option>
                    {positionOptions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('positionHandoverSalaryPercent')}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={draft.salaryHandoverPercent ?? 0}
                    onChange={(event) =>
                      patch('salaryHandoverPercent', Number(event.target.value))
                    }
                    className="input-field text-sm"
                  />
                  {handoverAllowanceBreakdown && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {t('positionHandoverSalaryPreview', {
                        dutySalary: formatAmount(dutySalaryPreview?.dutySalary ?? 0),
                        allowance: formatAmount(handoverAllowanceBreakdown.allowance),
                        workedDays: handoverAllowanceBreakdown.workedDays,
                        normDays: handoverAllowanceBreakdown.normDays,
                      })}
                    </p>
                  )}
                </div>
                <div>
                  <label className="field-label">{t('positionHandoverLedgerHint')}</label>
                  <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/60 px-3 py-2 text-xs text-[var(--text-muted)]">
                    {t('positionHandoverLedgerHintText')}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('positionHandoverPreparedAt')}</label>
                  <input
                    type="date"
                    value={draft.preparedAt}
                    onChange={(event) => patch('preparedAt', event.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="field-label">{t('positionHandoverEffectiveDate')}</label>
                  <input
                    type="date"
                    value={draft.effectiveDate}
                    onChange={(event) => patch('effectiveDate', event.target.value)}
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="field-label">{t('positionHandoverReason')}</label>
                <input
                  value={draft.reason}
                  onChange={(event) => patch('reason', event.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="field-label">{t('positionHandoverDuties')}</label>
                <textarea
                  value={draft.duties}
                  onChange={(event) => patch('duties', event.target.value)}
                  rows={5}
                  className="input-field text-sm"
                />
              </div>
            </div>
          )}

          <div
            id="finance-position-handover-document"
            lang="tg"
            className="position-handover-document mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none md:p-8"
          >
            <OrganizationReportDocumentHeader
              variant="document"
              showAddress={organization?.address}
            />
            <div className="mb-6 text-center text-xs leading-relaxed text-slate-700">
              <h3 className="mt-4 text-lg font-bold tracking-wide text-slate-900">
                {t('positionHandoverDocumentTitle')}
              </h3>
              <p className="mt-1 text-sm print-supplement">{t('positionHandoverDocumentSubtitle')}</p>
            </div>

            <div className="mb-5 space-y-1 text-xs text-slate-700">
              <p>
                {t('positionHandoverPreparedAt')}: <strong>{preparedAt}</strong>
              </p>
              <p>
                {t('positionHandoverEffectiveDate')}: <strong>{effectiveDate}</strong>
              </p>
            </div>

            <p className="mb-4 text-justify text-xs leading-relaxed md:text-sm">
              {t('positionHandoverIntro', {
                organization: reportOrganizationName || t('payrollLedgerOrganization'),
                date: effectiveDate,
              })}
            </p>

            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('positionHandoverFrom')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {fromEmployee?.fullName ??
                        (fromVacant ? `${fromVacant.position} (${t('staffVacant')})` : '________________')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('payrollLedgerColTabNo')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {fromEmployee?.personnelNumber ?? '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('positionHandoverTo')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {toEmployee?.fullName ?? '________________'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('payrollLedgerColTabNo')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {toEmployee?.personnelNumber ?? '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('employeeDepartment')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                      {draft.department || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('employeePosition')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                      {draft.position || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('positionHandoverSalaryPercent')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {(draft.salaryHandoverPercent ?? 0) > 0
                        ? `${draft.salaryHandoverPercent}%`
                        : '—'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('positionHandoverSalaryAmount')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {handoverAllowanceBreakdown
                        ? `${formatAmount(handoverAllowanceBreakdown.allowance)} сомонӣ`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('positionHandoverReason')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                      {draft.reason || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <p className="text-xs font-bold uppercase text-slate-700">
                {t('positionHandoverDuties')}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-justify text-xs leading-relaxed md:text-sm">
                {draft.duties || '—'}
              </p>
            </div>

            <p className="mb-8 text-justify text-xs leading-relaxed md:text-sm">
              {t('positionHandoverClosing')}
            </p>

            <div className="grid gap-8 text-xs text-slate-700 md:grid-cols-2">
              <div>
                <p className="font-semibold">{t('positionHandoverFrom')}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">
                  {fromEmployee?.fullName ??
                    (fromVacant ? `${fromVacant.position} (${t('staffVacant')})` : '________________')}
                </p>
              </div>
              <div>
                <p className="font-semibold">{t('positionHandoverTo')}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">
                  {toEmployee?.fullName ?? '________________'}
                </p>
              </div>
              <div>
                <p className="font-semibold">{directorSignatureLabel}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">
                  {organization?.director || '________________'}
                </p>
              </div>
              <div>
                <p className="font-semibold">{t('payrollLedgerAccountant')}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">
                  {organization?.chiefAccountant || '________________'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
