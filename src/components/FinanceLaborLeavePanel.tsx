'use client';

import {
  AVG_LEAVE_DAYS,
  SALARY_PERIOD_MONTH_OPTIONS,
  calcLaborLeavePayBreakdown,
  isPaidLaborLeaveType,
  isStateInsuranceLeaveType,
  leaveMonthKey,
  leaveMonthsAffected,
} from '@/lib/finance-labor-leave-pay';
import {
  GENERAL_LABOR_LEAVE_TYPES,
  calcLeaveDays,
  createLaborLeave,
  filterGeneralLaborLeaves,
  nextLaborLeaveOrderNumber,
  removeLaborLeave,
  syncLedgersAfterLaborLeaveChange,
  upsertLaborLeave,
} from '@/lib/finance-labor-leave';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import { formatAmount } from '@/lib/staff-table-calc';
import { updateOrganizationSection } from '@/lib/organization-sections';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { formatAppDate } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import {
  extractStaffingOptions,
  getPositionsForDepartment,
} from '@/lib/staff-staffing-options';
import { activeEmployees } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import {
  LaborLeave,
  LaborLeaveCalculationBasis,
  LaborLeaveType,
  OrganizationSectionContent,
  StaffEmployee,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  onLaborLeaveSaved?: (month: string) => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function employeeLabel(employee: StaffEmployee) {
  const parts = [employee.fullName];
  if (employee.position) parts.push(`— ${employee.position}`);
  if (employee.personnelNumber) parts.push(`(${employee.personnelNumber})`);
  return parts.join(' ');
}

export default function FinanceLaborLeavePanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onLaborLeaveSaved,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { organizationName: reportOrganizationName } = useOrganizationReportHeader();
  const directorSignatureLabel = getDirectorSignatureLabel(organizationId);
  const accountantSignatureLabel = useMemo(
    () =>
      getAccountantSignatureLabel(staffContent, {
        chiefAccountantName: organization?.chiefAccountant,
        fallback: t('payrollLedgerAccountant'),
      }),
    [staffContent, organization?.chiefAccountant, t]
  );
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
  const savedLeaves = useMemo(
    () => filterGeneralLaborLeaves(financeContent.laborLeaves),
    [financeContent.laborLeaves]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LaborLeave>(createLaborLeave());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

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

  useEffect(() => {
    if (editing && !selectedId) return;
    if (selectedId && savedLeaves.some((item) => item.id === selectedId)) return;
    if (savedLeaves.length > 0) {
      setSelectedId(savedLeaves[0].id);
      setDraft(savedLeaves[0]);
      setEditing(false);
      return;
    }
    setSelectedId(null);
    setDraft({
      ...createLaborLeave(),
      orderNumber: nextLaborLeaveOrderNumber(financeContent.laborLeaves),
      reason: t('laborLeaveDefaultReason'),
    });
    setEditing(true);
  }, [savedLeaves, selectedId, editing, financeContent.laborLeaves, t]);

  function patch<K extends keyof LaborLeave>(field: K, value: LaborLeave[K]) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === 'startDate' || field === 'endDate') {
        next.days = calcLeaveDays(
          field === 'startDate' ? String(value) : current.startDate,
          field === 'endDate' ? String(value) : current.endDate
        );
      }
      return next;
    });
  }

  function applyEmployee(employeeId: string) {
    const employee = employeeMap.get(employeeId);
    setDraft((current) => ({
      ...current,
      employeeId,
      ...(employee
        ? {
            department: employee.department ?? current.department,
            position: employee.position ?? current.position,
          }
        : {}),
    }));
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

  function formatDate(value: string) {
    if (!value) return '—';
    return formatAppDate(`${value}T00:00:00`, locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function monthsToSyncLeave(nextLeave: LaborLeave, previousLeave?: LaborLeave) {
    const months = new Set<string>();
    if (isPaidLaborLeaveType(nextLeave.leaveType)) {
      for (const month of leaveMonthsAffected(nextLeave)) months.add(month);
    }
    if (previousLeave && isPaidLaborLeaveType(previousLeave.leaveType)) {
      for (const month of leaveMonthsAffected(previousLeave)) months.add(month);
    }
    return [...months];
  }

  async function persist(nextLeave: LaborLeave) {
    setSaving(true);
    setError('');

    const previousLeave = financeContent.laborLeaves?.find((item) => item.id === nextLeave.id);
    const nextLeaves = upsertLaborLeave(financeContent.laborLeaves, nextLeave);
    const payrollLedgers = staffContent
      ? syncLedgersAfterLaborLeaveChange(
          financeContent.payrollLedgers,
          nextLeaves,
          staffContent,
          monthsToSyncLeave(nextLeave, previousLeave),
          organizationId,
          financeContent.funeralAllowances
        )
      : financeContent.payrollLedgers;

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      laborLeaves: nextLeaves,
      payrollLedgers,
    };

    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return false;
    }

    onUpdate(saved);
    setSelectedId(nextLeave.id);
    setDraft(nextLeave);
    setEditing(false);
    if (isPaidLaborLeaveType(nextLeave.leaveType)) {
      const month = leaveMonthKey(nextLeave.startDate);
      onLaborLeaveSaved?.(month);
      setSaveNotice(t('laborLeaveSavedLedgerMonth', { month }));
    } else {
      setSaveNotice('');
    }
    return true;
  }

  async function handleSave() {
    if (!draft.employeeId) {
      setError(t('laborLeaveEmployeeRequired'));
      return;
    }
    if (!draft.startDate || !draft.endDate) {
      setError(t('laborLeaveDatesRequired'));
      return;
    }
    if (draft.days <= 0) {
      setError(t('laborLeaveInvalidDates'));
      return;
    }
    await persist({
      ...draft,
      orderNumber: draft.orderNumber.trim() || nextLaborLeaveOrderNumber(financeContent.laborLeaves),
      substituteEmployeeId: draft.substituteEmployeeId?.trim() || undefined,
      salaryPeriodMonths: draft.salaryPeriodMonths ?? 12,
      calculationBasis: draft.calculationBasis ?? 'twelve_months',
      lastSalaryRaiseDate:
        draft.calculationBasis === 'since_last_raise'
          ? draft.lastSalaryRaiseDate?.trim() || undefined
          : undefined,
    });
  }

  async function handleDelete() {
    if (!selectedId || !confirm(t('confirmDeleteLaborLeave'))) return;

    setSaving(true);
    const deleted = financeContent.laborLeaves?.find((item) => item.id === selectedId);
    const nextLeaves = removeLaborLeave(financeContent.laborLeaves, selectedId);
    const payrollLedgers =
      staffContent && deleted && isPaidLaborLeaveType(deleted.leaveType)
        ? syncLedgersAfterLaborLeaveChange(
            financeContent.payrollLedgers,
            nextLeaves,
            staffContent,
            leaveMonthsAffected(deleted),
            organizationId,
            financeContent.funeralAllowances
          )
        : financeContent.payrollLedgers;
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      laborLeaves: nextLeaves,
      payrollLedgers,
    };
    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    const next = filterGeneralLaborLeaves(saved.laborLeaves);
    if (next.length > 0) {
      setSelectedId(next[0].id);
      setDraft(next[0]);
      setEditing(false);
    } else {
      setSelectedId(null);
      setDraft({
        ...createLaborLeave(),
        orderNumber: nextLaborLeaveOrderNumber(saved.laborLeaves),
        reason: t('laborLeaveDefaultReason'),
      });
      setEditing(true);
    }
  }

  function handleCreate() {
    setSelectedId(null);
    setDraft({
      ...createLaborLeave(),
      orderNumber: nextLaborLeaveOrderNumber(financeContent.laborLeaves),
      reason: t('laborLeaveDefaultReason'),
    });
    setEditing(true);
  }

  const employee = employeeMap.get(draft.employeeId);
  const substitute = draft.substituteEmployeeId
    ? employeeMap.get(draft.substituteEmployeeId)
    : undefined;
  const canPrint = Boolean(draft.employeeId && draft.days > 0);
  const payBreakdown = useMemo(() => {
    if (!staffContent || !draft.employeeId) return null;
    return calcLaborLeavePayBreakdown(
      draft,
      staffContent,
      financeContent.payrollLedgers
    );
  }, [staffContent, draft, financeContent.payrollLedgers]);

  return (
    <section id="finance-labor-leave" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavLaborLeave')}</p>
          <h4 className="text-base font-bold">{t('laborLeaveTitle')}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedLeaves.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(event) => {
                const id = event.target.value;
                const saved = savedLeaves.find((item) => item.id === id);
                if (!saved) return;
                setSelectedId(id);
                setDraft(saved);
                setEditing(false);
              }}
              className="input-field w-auto text-xs"
              disabled={saving || editing}
            >
              {savedLeaves.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.orderNumber || '—'} — {employeeMap.get(item.employeeId)?.fullName ?? '—'} (
                  {formatDate(item.startDate)} – {formatDate(item.endDate)})
                </option>
              ))}
            </select>
          )}
          {canEdit && (
          <button type="button" onClick={handleCreate} className="btn-secondary text-xs" disabled={saving}>
            + {t('laborLeaveAdd')}
          </button>
          )}
          <button
            type="button"
            onClick={() => printDocument('finance-labor-leave-document')}
            className="btn-primary text-xs"
            disabled={!canPrint}
          >
            🖨 {t('laborLeavePrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-labor-leave-document"
            filename={`rukhsat-${draft.orderNumber || 'hujjat'}`}
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
                {t('laborLeaveEdit')}
              </button>
              {selectedId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-danger text-xs"
                  disabled={saving}
                >
                  {t('laborLeaveDelete')}
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
        <p className="text-xs text-[var(--text-muted)]">{t('laborLeaveNeedEmployees')}</p>
      ) : (
        <>
          {editing && (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-4 print:hidden">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('laborLeaveOrderNumber')}</label>
                  <input
                    value={draft.orderNumber}
                    onChange={(event) => patch('orderNumber', event.target.value)}
                    className="input-field text-sm"
                    placeholder={nextLaborLeaveOrderNumber(financeContent.laborLeaves)}
                  />
                </div>
                <div>
                  <label className="field-label">{t('laborLeavePreparedAt')}</label>
                  <input
                    type="date"
                    value={draft.preparedAt}
                    onChange={(event) => patch('preparedAt', event.target.value)}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">{t('laborLeaveEmployee')}</label>
                <select
                  value={draft.employeeId}
                  onChange={(event) => applyEmployee(event.target.value)}
                  className="input-field text-sm"
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
                  <label className="field-label">{t('laborLeaveCalculationBasis')}</label>
                  <select
                    value={draft.calculationBasis ?? 'twelve_months'}
                    onChange={(event) =>
                      patch(
                        'calculationBasis',
                        event.target.value as LaborLeaveCalculationBasis
                      )
                    }
                    className="input-field text-sm"
                  >
                    <option value="twelve_months">{t('laborLeaveBasisTwelveMonths')}</option>
                    <option value="since_last_raise">{t('laborLeaveBasisSinceRaise')}</option>
                  </select>
                </div>
                {(draft.calculationBasis ?? 'twelve_months') === 'since_last_raise' && (
                  <div>
                    <label className="field-label">{t('laborLeaveLastRaiseDate')}</label>
                    <input
                      type="date"
                      value={draft.lastSalaryRaiseDate ?? ''}
                      onChange={(event) => patch('lastSalaryRaiseDate', event.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('laborLeaveSalaryPeriod')}</label>
                  <select
                    value={draft.salaryPeriodMonths ?? 12}
                    onChange={(event) =>
                      patch('salaryPeriodMonths', Number(event.target.value))
                    }
                    className="input-field text-sm"
                  >
                    {SALARY_PERIOD_MONTH_OPTIONS.map((months) => (
                      <option key={months} value={months}>
                        {t('laborLeaveSalaryPeriodMonths', { months })}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {t('laborLeaveSalaryPeriodHint')}
                  </p>
                </div>
                <div>
                  <label className="field-label">{t('laborLeavePayPreview')}</label>
                  <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/60 px-3 py-2 text-xs text-[var(--text-muted)]">
                    {isStateInsuranceLeaveType(draft.leaveType)
                      ? t('laborLeaveStateInsuranceNote')
                      : payBreakdown
                        ? t('laborLeavePayPreviewText', {
                            average: formatAmount(payBreakdown.averageMonthly),
                            daily: formatAmount(payBreakdown.dailyRate),
                            days: AVG_LEAVE_DAYS,
                            leaveDays: payBreakdown.leaveDays,
                            amount: formatAmount(payBreakdown.amount),
                            includesCurrent: payBreakdown.includesLeaveMonth
                              ? t('laborLeaveIncludesCurrentMonth')
                              : t('laborLeaveExcludesCurrentMonth'),
                            holidaysExcluded: payBreakdown.holidaysExcluded,
                            fallback: payBreakdown.usedTariffFallback
                              ? t('laborLeaveTariffFallback')
                              : '',
                          })
                        : t('laborLeavePayPreviewEmpty')}
                  </p>
                  {isPaidLaborLeaveType(draft.leaveType) && (
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {t('laborLeavePayLedgerHint')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('laborLeaveType')}</label>
                  <select
                    value={draft.leaveType}
                    onChange={(event) => patch('leaveType', event.target.value as LaborLeaveType)}
                    className="input-field text-sm"
                  >
                    {GENERAL_LABOR_LEAVE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`laborLeaveType_${type}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">{t('laborLeaveSubstitute')}</label>
                  <select
                    value={draft.substituteEmployeeId ?? ''}
                    onChange={(event) => patch('substituteEmployeeId', event.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">{t('laborLeaveNoSubstitute')}</option>
                    {employees
                      .filter((item) => item.id !== draft.employeeId)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {employeeLabel(item)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="field-label">{t('laborLeaveStartDate')}</label>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(event) => patch('startDate', event.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="field-label">{t('laborLeaveEndDate')}</label>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(event) => patch('endDate', event.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="field-label">{t('laborLeaveDays')}</label>
                  <input
                    type="number"
                    min={1}
                    value={draft.days}
                    onChange={(event) => patch('days', Number(event.target.value))}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">{t('laborLeaveReason')}</label>
                <input
                  value={draft.reason}
                  onChange={(event) => patch('reason', event.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </div>
          )}

          <div
            id="finance-labor-leave-document"
            lang="tg"
            className="labor-leave-document mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none md:p-8"
          >
            <OrganizationReportDocumentHeader
              variant="document"
              showAddress={organization?.address}
            />
            <div className="mb-6 text-center text-xs leading-relaxed text-slate-700">
              <h3 className="text-lg font-bold tracking-wide text-slate-900">
                {t('laborLeaveDocumentTitle')}
              </h3>
              <p className="mt-1 text-sm print-supplement">{t('laborLeaveDocumentSubtitle')}</p>
            </div>

            <div className="mb-5 flex flex-wrap justify-between gap-2 text-xs text-slate-700">
              <p>
                {t('laborLeaveOrderNumber')}: <strong>{draft.orderNumber || '—'}</strong>
              </p>
              <p>
                {t('laborLeavePreparedAt')}: <strong>{formatDate(draft.preparedAt)}</strong>
              </p>
            </div>

            <p className="mb-4 text-justify text-xs leading-relaxed md:text-sm">
              {t('laborLeaveIntro', {
                organization: reportOrganizationName || t('payrollLedgerOrganization'),
                employee: employee?.fullName ?? '________________',
                leaveType: t(`laborLeaveType_${draft.leaveType}`),
                startDate: formatDate(draft.startDate),
                endDate: formatDate(draft.endDate),
                days: draft.days,
              })}
            </p>

            <div className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('laborLeaveEmployee')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {employee?.fullName ?? '________________'}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('payrollLedgerColTabNo')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {employee?.personnelNumber ?? '—'}
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
                      {t('laborLeaveType')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {t(`laborLeaveType_${draft.leaveType}`)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('laborLeaveDays')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {draft.days > 0 ? `${draft.days} ${t('laborLeaveDayUnit')}` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('laborLeavePeriod')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                      {formatDate(draft.startDate)} — {formatDate(draft.endDate)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('laborLeaveSubstitute')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                      {substitute?.fullName ?? '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('laborLeaveSalaryPeriod')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {draft.salaryPeriodMonths ?? 12} {t('laborLeaveMonthUnit')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('laborLeavePayAmount')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2">
                      {payBreakdown ? `${formatAmount(payBreakdown.amount)} сомонӣ` : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('laborLeaveReason')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                      {draft.reason || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mb-8 text-justify text-xs leading-relaxed md:text-sm">
              {t('laborLeaveClosing')}
            </p>

            <div className="grid gap-8 text-xs text-slate-700 md:grid-cols-2">
              <div>
                <p className="font-semibold">{directorSignatureLabel}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">
                  {organization?.director || '________________'}
                </p>
              </div>
              <div>
                <p className="font-semibold">{accountantSignatureLabel}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">
                  {organization?.chiefAccountant || '________________'}
                </p>
              </div>
              <div>
                <p className="font-semibold">{t('laborLeaveEmployee')}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">
                  {employee?.fullName ?? '________________'}
                </p>
              </div>
              <div>
                <p className="font-semibold">{t('laborLeaveHr')}</p>
                <p className="mt-6 border-t border-slate-400 pt-1">________________</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
