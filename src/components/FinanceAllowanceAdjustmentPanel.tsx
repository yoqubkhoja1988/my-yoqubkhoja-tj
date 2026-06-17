'use client';

import {
  allowanceMonthsAffected,
  allowancePaymentMonth,
  calcAllowanceAdjustmentBreakdown,
  createSalaryAllowanceAdjustment,
  explainAllowanceBreakdownIssue,
  formatQualificationDutySalaryPreview,
  nextAllowanceOrderNumber,
  previewDutySalaryFromEducation,
  removeSalaryAllowanceAdjustment,
  sortSalaryAllowanceAdjustments,
  syncLedgersAfterAllowanceAdjustmentChange,
  upsertSalaryAllowanceAdjustment,
} from '@/lib/finance-allowance-adjustment';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import { formatAmount } from '@/lib/staff-table-calc';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { getEducationLevelsForOrganization } from '@/lib/preschool-wage-scales';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
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
  AllowanceAdjustmentKind,
  OrganizationSectionContent,
  SalaryAllowanceAdjustment,
  StaffEmployee,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  onAllowanceSaved?: (month: string) => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function employeeLabel(employee: StaffEmployee) {
  const parts = [employee.fullName];
  if (employee.position) parts.push(`— ${employee.position}`);
  if (employee.personnelNumber) parts.push(`(${employee.personnelNumber})`);
  return parts.join(' ');
}

function defaultLegalBasis(kind: AllowanceAdjustmentKind, t: (key: string) => string) {
  return kind === 'qualification_degree_difference'
    ? t('allowanceDefaultLegalBasisQualification')
    : t('allowanceDefaultLegalBasisPastMonth');
}

function defaultReason(kind: AllowanceAdjustmentKind, t: (key: string) => string) {
  return kind === 'qualification_degree_difference'
    ? t('allowanceDefaultReasonQualification')
    : t('allowanceDefaultReasonPastMonth');
}

export default function FinanceAllowanceAdjustmentPanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onAllowanceSaved,
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
  const savedAdjustments = useMemo(
    () => sortSalaryAllowanceAdjustments(financeContent.salaryAllowanceAdjustments),
    [financeContent.salaryAllowanceAdjustments]
  );
  const educationLevels = useMemo(
    () => getEducationLevelsForOrganization(organizationId),
    [organizationId]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalaryAllowanceAdjustment>(createSalaryAllowanceAdjustment());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    if (editing && !selectedId) return;
    if (selectedId && savedAdjustments.some((item) => item.id === selectedId)) return;
    if (savedAdjustments.length > 0) {
      setSelectedId(savedAdjustments[0].id);
      setDraft(savedAdjustments[0]);
      setEditing(false);
      return;
    }
    setSelectedId(null);
    setDraft({
      ...createSalaryAllowanceAdjustment(),
      orderNumber: nextAllowanceOrderNumber(financeContent.salaryAllowanceAdjustments),
      legalBasis: defaultLegalBasis('qualification_degree_difference', t),
      reason: defaultReason('qualification_degree_difference', t),
    });
    setEditing(true);
  }, [savedAdjustments, selectedId, editing, financeContent.salaryAllowanceAdjustments, t]);

  const employee = employeeMap.get(draft.employeeId);
  const isQualificationKind = draft.kind === 'qualification_degree_difference';

  const qualificationSalaries = useMemo(() => {
    if (!employee || !isQualificationKind) return null;
    const from =
      draft.fromEducationLevel &&
      previewDutySalaryFromEducation(employee, draft.fromEducationLevel, organizationId);
    const to =
      draft.toEducationLevel &&
      previewDutySalaryFromEducation(employee, draft.toEducationLevel, organizationId);
    return { from, to };
  }, [
    employee,
    isQualificationKind,
    draft.fromEducationLevel,
    draft.toEducationLevel,
    organizationId,
  ]);

  const breakdownIssue = useMemo(() => {
    if (!staffContent || !draft.employeeId) return null;
    return explainAllowanceBreakdownIssue(
      draft,
      staffContent,
      organizationId,
      financeContent.laborLeaves
    );
  }, [staffContent, draft, organizationId, financeContent.laborLeaves]);

  const breakdown = useMemo(() => {
    if (!staffContent || !draft.employeeId) return null;
    return calcAllowanceAdjustmentBreakdown(
      draft,
      staffContent,
      organizationId,
      financeContent.laborLeaves
    );
  }, [staffContent, draft, organizationId, financeContent.laborLeaves]);

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

  function formatDate(value: string) {
    if (!value) return '—';
    return formatAppDate(`${value}T00:00:00`, locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatMonth(value: string) {
    if (!value) return '—';
    const [year, month] = value.split('-');
    if (!year || !month) return value;
    return formatAppDate(`${value}-01T00:00:00`, locale, { month: 'long', year: 'numeric' });
  }

  function patch<K extends keyof SalaryAllowanceAdjustment>(
    field: K,
    value: SalaryAllowanceAdjustment[K]
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function applyKind(kind: AllowanceAdjustmentKind) {
    setDraft((current) => ({
      ...current,
      kind,
      legalBasis: defaultLegalBasis(kind, t),
      reason: defaultReason(kind, t),
      ...(kind === 'past_month_difference'
        ? { fromEducationLevel: undefined, toEducationLevel: undefined }
        : { fromDutySalary: undefined, toDutySalary: undefined }),
    }));
  }

  function applyEducationLevel(
    field: 'fromEducationLevel' | 'toEducationLevel',
    value: SalaryAllowanceAdjustment['fromEducationLevel']
  ) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (employee && value) {
        const preview = formatQualificationDutySalaryPreview(employee, value, organizationId);
        if (field === 'fromEducationLevel') next.fromDutySalary = preview;
        if (field === 'toEducationLevel') next.toDutySalary = preview;
      }
      return next;
    });
  }

  function applyEmployee(employeeId: string) {
    const selected = employeeMap.get(employeeId);
    setDraft((current) => {
      const next: SalaryAllowanceAdjustment = {
        ...current,
        employeeId,
        ...(selected
          ? {
              department: selected.department ?? current.department,
              position: selected.position ?? current.position,
            }
          : {}),
      };
      if (
        current.kind === 'qualification_degree_difference' &&
        selected?.wageScale?.educationLevel
      ) {
        next.toEducationLevel = selected.wageScale.educationLevel;
        next.toDutySalary = formatQualificationDutySalaryPreview(
          selected,
          selected.wageScale.educationLevel,
          organizationId
        );
      }
      return next;
    });
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

  async function persist(nextAdjustment: SalaryAllowanceAdjustment) {
    setSaving(true);
    setError('');

    const previous = financeContent.salaryAllowanceAdjustments?.find(
      (item) => item.id === nextAdjustment.id
    );
    const nextAdjustments = upsertSalaryAllowanceAdjustment(
      financeContent.salaryAllowanceAdjustments,
      nextAdjustment
    );
    const payrollLedgers = staffContent
      ? syncLedgersAfterAllowanceAdjustmentChange(
          financeContent.payrollLedgers,
          nextAdjustments,
          staffContent,
          allowanceMonthsAffected(nextAdjustment, previous),
          financeContent.laborLeaves,
          organizationId,
          financeContent.positionHandovers
        )
      : financeContent.payrollLedgers;

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      salaryAllowanceAdjustments: nextAdjustments,
      payrollLedgers,
    };

    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return false;
    }

    onUpdate(saved);
    setSelectedId(nextAdjustment.id);
    setDraft(nextAdjustment);
    setEditing(false);
    const month = allowancePaymentMonth(nextAdjustment);
    onAllowanceSaved?.(month);
    setSaveNotice(t('allowanceSavedLedgerMonth', { month }));
    return true;
  }

  async function handleSave() {
    if (!draft.employeeId) {
      setError(t('allowanceEmployeeRequired'));
      return;
    }
    if (!draft.effectiveDate) {
      setError(t('allowanceEffectiveDateRequired'));
      return;
    }
    if (!draft.paymentMonth) {
      setError(t('allowancePaymentMonthRequired'));
      return;
    }

    if (!staffContent) {
      setError(t('sectionSaveError'));
      return;
    }

    const issue = explainAllowanceBreakdownIssue(
      draft,
      staffContent,
      organizationId,
      financeContent.laborLeaves
    );
    if (issue === 'missing_qualification_levels') {
      setError(t('allowanceEducationLevelsRequired'));
      return;
    }
    if (issue === 'missing_manual_salaries') {
      setError(t('allowanceDutySalariesRequired'));
      return;
    }
    if (issue === 'invalid_salary_diff') {
      setError(t('allowanceSalaryDiffInvalid'));
      return;
    }
    if (issue === 'no_calc_months') {
      setError(
        isQualificationKind
          ? t('allowanceNoCalcMonthsQualification')
          : t('allowanceNoRetroMonthsOnSave')
      );
      return;
    }
    if (issue === 'no_worked_days') {
      setError(t('allowanceNoWorkedDays'));
      return;
    }
    if (!breakdown || breakdown.totalAmount <= 0) {
      setError(t('allowanceInvalidAmount'));
      return;
    }

    await persist({
      ...draft,
      orderNumber:
        draft.orderNumber.trim() ||
        nextAllowanceOrderNumber(financeContent.salaryAllowanceAdjustments),
      legalBasis: draft.legalBasis.trim() || defaultLegalBasis(draft.kind, t),
      reason: draft.reason.trim() || defaultReason(draft.kind, t),
    });
  }

  async function handleDelete() {
    if (!selectedId || !confirm(t('confirmDeleteAllowance'))) return;

    setSaving(true);
    const deleted = financeContent.salaryAllowanceAdjustments?.find((item) => item.id === selectedId);
    const nextAdjustments = removeSalaryAllowanceAdjustment(
      financeContent.salaryAllowanceAdjustments,
      selectedId
    );
    const payrollLedgers =
      staffContent && deleted
        ? syncLedgersAfterAllowanceAdjustmentChange(
            financeContent.payrollLedgers,
            nextAdjustments,
            staffContent,
            allowanceMonthsAffected(deleted),
            financeContent.laborLeaves,
            organizationId,
            financeContent.positionHandovers
          )
        : financeContent.payrollLedgers;

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      salaryAllowanceAdjustments: nextAdjustments,
      payrollLedgers,
    };
    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    const next = sortSalaryAllowanceAdjustments(saved.salaryAllowanceAdjustments);
    if (next.length > 0) {
      setSelectedId(next[0].id);
      setDraft(next[0]);
      setEditing(false);
    } else {
      setSelectedId(null);
      setDraft({
        ...createSalaryAllowanceAdjustment(),
        orderNumber: nextAllowanceOrderNumber(saved.salaryAllowanceAdjustments),
        legalBasis: defaultLegalBasis('qualification_degree_difference', t),
        reason: defaultReason('qualification_degree_difference', t),
      });
      setEditing(true);
    }
  }

  function handleCreate() {
    setSelectedId(null);
    setDraft({
      ...createSalaryAllowanceAdjustment(),
      orderNumber: nextAllowanceOrderNumber(financeContent.salaryAllowanceAdjustments),
      legalBasis: defaultLegalBasis('qualification_degree_difference', t),
      reason: defaultReason('qualification_degree_difference', t),
    });
    setEditing(true);
  }

  const canPrint = Boolean(draft.employeeId && breakdown && breakdown.totalAmount > 0);
  const kindLabel =
    draft.kind === 'qualification_degree_difference'
      ? t('allowanceKindQualification')
      : t('allowanceKindPastMonth');

  return (
    <section id="finance-allowance-adjustment" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavAllowance')}</p>
          <h4 className="text-base font-bold">{t('allowanceTitle')}</h4>
          <p className="mt-1 max-w-2xl text-xs text-[var(--text-muted)]">{t('allowanceSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedAdjustments.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(event) => {
                const id = event.target.value;
                const saved = savedAdjustments.find((item) => item.id === id);
                if (!saved) return;
                setSelectedId(id);
                setDraft(saved);
                setEditing(false);
              }}
              className="input-field w-auto text-xs"
              disabled={saving || editing}
            >
              {savedAdjustments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.orderNumber || '—'} — {employeeMap.get(item.employeeId)?.fullName ?? '—'} (
                  {formatDate(item.effectiveDate)})
                </option>
              ))}
            </select>
          )}
          {canEdit && (
            <button type="button" onClick={handleCreate} className="btn-secondary text-xs" disabled={saving}>
              + {t('allowanceAdd')}
            </button>
          )}
          <button
            type="button"
            onClick={() => printDocument('finance-allowance-document')}
            className="btn-primary text-xs"
            disabled={!canPrint}
          >
            🖨 {t('allowancePrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-allowance-document"
            filename={`ilovapuli-${draft.orderNumber || 'hujjat'}`}
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
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary text-xs"
                disabled={saving}
              >
                {t('allowanceEdit')}
              </button>
            ))}
          {canEdit && selectedId && !editing && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-secondary text-xs text-red-400"
              disabled={saving}
            >
              {t('allowanceDelete')}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-400 print:hidden">{error}</p>}
      {saveNotice && <p className="text-sm text-green-400 print:hidden">{saveNotice}</p>}

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <label className="block text-xs font-semibold text-[var(--text-muted)]">
            {t('allowanceKind')}
          </label>
          <div className="flex flex-wrap gap-2">
            {(
              ['qualification_degree_difference', 'past_month_difference'] as AllowanceAdjustmentKind[]
            ).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={!editing || saving}
                onClick={() => applyKind(kind)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  draft.kind === kind
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                {kind === 'qualification_degree_difference'
                  ? t('allowanceKindQualification')
                  : t('allowanceKindPastMonth')}
              </button>
            ))}
          </div>

          <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-muted)]">
            {isQualificationKind
              ? t('allowanceModeHintQualification')
              : t('allowanceModeHintPastMonth')}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-semibold text-[var(--text-muted)]">{t('allowanceOrderNumber')}</span>
              <input
                type="text"
                value={draft.orderNumber}
                onChange={(event) => patch('orderNumber', event.target.value)}
                className="input-field mt-1"
                disabled={!editing || saving}
              />
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-[var(--text-muted)]">{t('allowancePreparedAt')}</span>
              <input
                type="date"
                value={draft.preparedAt}
                onChange={(event) => patch('preparedAt', event.target.value)}
                className="input-field mt-1"
                disabled={!editing || saving}
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="font-semibold text-[var(--text-muted)]">{t('allowanceEmployee')}</span>
              <select
                value={draft.employeeId}
                onChange={(event) => applyEmployee(event.target.value)}
                className="input-field mt-1"
                disabled={!editing || saving}
              >
                <option value="">{t('allowanceSelectEmployee')}</option>
                {employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {employeeLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-[var(--text-muted)]">{t('allowanceDepartment')}</span>
              <select
                value={draft.department}
                onChange={(event) => applyDepartment(event.target.value)}
                className="input-field mt-1"
                disabled={!editing || saving}
              >
                <option value="">{t('allowanceSelectDepartment')}</option>
                {departmentOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-[var(--text-muted)]">{t('allowancePosition')}</span>
              <select
                value={draft.position}
                onChange={(event) => patch('position', event.target.value)}
                className="input-field mt-1"
                disabled={!editing || saving}
              >
                <option value="">{t('allowanceSelectPosition')}</option>
                {positionOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-[var(--text-muted)]">{t('allowanceEffectiveDate')}</span>
              <input
                type="date"
                value={draft.effectiveDate}
                onChange={(event) => patch('effectiveDate', event.target.value)}
                className="input-field mt-1"
                disabled={!editing || saving}
              />
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-[var(--text-muted)]">{t('allowancePaymentMonth')}</span>
              <input
                type="month"
                value={draft.paymentMonth}
                onChange={(event) => patch('paymentMonth', event.target.value)}
                className="input-field mt-1"
                disabled={!editing || saving}
              />
            </label>
          </div>

          {isQualificationKind ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="font-semibold text-[var(--text-muted)]">
                    {t('allowanceFromEducationLevel')}
                  </span>
                  <select
                    value={draft.fromEducationLevel ?? ''}
                    onChange={(event) =>
                      applyEducationLevel(
                        'fromEducationLevel',
                        event.target.value as SalaryAllowanceAdjustment['fromEducationLevel']
                      )
                    }
                    className="input-field mt-1"
                    disabled={!editing || saving || !employee}
                  >
                    <option value="">{t('allowanceSelectEducationLevel')}</option>
                    {educationLevels.map((level) => (
                      <option key={level} value={level}>
                        {t(`wageScaleEducation_${level}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-[var(--text-muted)]">
                    {t('allowanceToEducationLevel')}
                  </span>
                  <select
                    value={draft.toEducationLevel ?? ''}
                    onChange={(event) =>
                      applyEducationLevel(
                        'toEducationLevel',
                        event.target.value as SalaryAllowanceAdjustment['toEducationLevel']
                      )
                    }
                    className="input-field mt-1"
                    disabled={!editing || saving || !employee}
                  >
                    <option value="">{t('allowanceSelectEducationLevel')}</option>
                    {educationLevels.map((level) => (
                      <option key={level} value={level}>
                        {t(`wageScaleEducation_${level}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {qualificationSalaries && (
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <p className="text-[var(--text-muted)]">
                    {t('allowanceTariffFrom')}:{' '}
                    <strong className="text-[var(--text)]">
                      {qualificationSalaries.from != null
                        ? `${formatAmount(qualificationSalaries.from)} сомонӣ`
                        : '—'}
                    </strong>
                  </p>
                  <p className="text-[var(--text-muted)]">
                    {t('allowanceTariffTo')}:{' '}
                    <strong className="text-[var(--text)]">
                      {qualificationSalaries.to != null
                        ? `${formatAmount(qualificationSalaries.to)} сомонӣ`
                        : '—'}
                    </strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-semibold text-[var(--text-muted)]">{t('allowanceFromDutySalary')}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.fromDutySalary ?? ''}
                  onChange={(event) => patch('fromDutySalary', event.target.value)}
                  className="input-field mt-1"
                  disabled={!editing || saving}
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-[var(--text-muted)]">{t('allowanceToDutySalary')}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.toDutySalary ?? ''}
                  onChange={(event) => patch('toDutySalary', event.target.value)}
                  className="input-field mt-1"
                  disabled={!editing || saving}
                />
              </label>
            </div>
          )}

          <label className="block text-xs">
            <span className="font-semibold text-[var(--text-muted)]">{t('allowanceLegalBasis')}</span>
            <textarea
              value={draft.legalBasis}
              onChange={(event) => patch('legalBasis', event.target.value)}
              className="input-field mt-1 min-h-[72px]"
              disabled={!editing || saving}
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-[var(--text-muted)]">{t('allowanceReason')}</span>
            <textarea
              value={draft.reason}
              onChange={(event) => patch('reason', event.target.value)}
              className="input-field mt-1 min-h-[72px]"
              disabled={!editing || saving}
            />
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h5 className="text-sm font-bold">{t('allowanceBreakdownTitle')}</h5>
          <p className="text-xs text-[var(--text-muted)]">
            {isQualificationKind
              ? t('allowanceBreakdownHintQualification')
              : t('allowanceBreakdownHintPastMonth')}
          </p>
          {breakdown ? (
            <>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <p>
                  <span className="text-[var(--text-muted)]">{t('allowanceFromDutySalary')}:</span>{' '}
                  {formatAmount(breakdown.fromSalary)} сомонӣ
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">{t('allowanceToDutySalary')}:</span>{' '}
                  {formatAmount(breakdown.toSalary)} сомонӣ
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">{t('allowanceMonthlyDiff')}:</span>{' '}
                  {formatAmount(breakdown.monthlyDiff)} сомонӣ
                </p>
                <p>
                  <span className="text-[var(--text-muted)]">{t('allowancePaymentMonth')}:</span>{' '}
                  {formatMonth(breakdown.paymentMonth)}
                </p>
              </div>
              {breakdown.lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                        <th className="py-2 pr-2">{t('allowanceColMonth')}</th>
                        <th className="py-2 pr-2">{t('allowanceColWorkedDays')}</th>
                        <th className="py-2 pr-2">{t('allowanceColNormDays')}</th>
                        <th className="py-2">{t('allowanceColAmount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.lines.map((line) => (
                        <tr key={line.month} className="border-b border-[var(--border)]/60">
                          <td className="py-2 pr-2">
                            {formatMonth(line.month)}
                            {line.partialFromDay && line.partialFromDay > 1
                              ? ` (${t('allowanceFromDay', { day: line.partialFromDay })})`
                              : ''}
                          </td>
                          <td className="py-2 pr-2">{line.workedDays}</td>
                          <td className="py-2 pr-2">{line.normDays}</td>
                          <td className="py-2">
                            {formatAmount(line.amount)} сомонӣ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-2 pr-2 text-right font-semibold">
                          {t('allowanceTotal')}
                        </td>
                        <td className="py-2 font-bold text-[var(--accent)]">
                          {formatAmount(breakdown.totalAmount)} сомонӣ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-amber-400">{t('allowanceNoRetroMonthsHint')}</p>
              )}
              <p className="text-xs text-[var(--text-muted)]">{t('allowanceLedgerHint')}</p>
            </>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              {breakdownIssue === 'missing_qualification_levels'
                ? t('allowanceEducationLevelsRequired')
                : breakdownIssue === 'missing_manual_salaries'
                  ? t('allowanceDutySalariesRequired')
                : breakdownIssue === 'invalid_salary_diff'
                  ? t('allowanceSalaryDiffInvalid')
                  : breakdownIssue === 'no_calc_months'
                    ? isQualificationKind
                      ? t('allowanceNoCalcMonthsQualification')
                      : t('allowanceNoRetroMonthsHint')
                    : breakdownIssue === 'no_worked_days'
                      ? t('allowanceNoWorkedDays')
                      : t('allowanceBreakdownEmpty')}
            </p>
          )}
        </div>
      </div>

      <div
        id="finance-allowance-document"
        lang="tg"
        className="mx-auto hidden max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:block print:border-0 print:shadow-none md:p-8"
      >
        <OrganizationReportDocumentHeader variant="document" showAddress={organization?.address} />
        <div className="mb-6 text-center text-xs leading-relaxed text-slate-700">
          <h3 className="mt-4 text-lg font-bold tracking-wide text-slate-900">
            {t('allowanceDocumentTitle')}
          </h3>
          <p className="mt-1 text-sm">{kindLabel}</p>
        </div>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>{t('allowanceDocumentIntro', { organization: reportOrganizationName })}</p>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-black/20 px-2 py-1 font-semibold">{t('allowanceEmployee')}</td>
                <td className="border border-black/20 px-2 py-1">{employee?.fullName ?? '—'}</td>
              </tr>
              <tr>
                <td className="border border-black/20 px-2 py-1 font-semibold">{t('allowancePosition')}</td>
                <td className="border border-black/20 px-2 py-1">{draft.position || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black/20 px-2 py-1 font-semibold">{t('allowanceKind')}</td>
                <td className="border border-black/20 px-2 py-1">{kindLabel}</td>
              </tr>
              <tr>
                <td className="border border-black/20 px-2 py-1 font-semibold">{t('allowanceLegalBasis')}</td>
                <td className="border border-black/20 px-2 py-1">{draft.legalBasis || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black/20 px-2 py-1 font-semibold">{t('allowanceReason')}</td>
                <td className="border border-black/20 px-2 py-1">{draft.reason || '—'}</td>
              </tr>
              <tr>
                <td className="border border-black/20 px-2 py-1 font-semibold">{t('allowanceTotal')}</td>
                <td className="border border-black/20 px-2 py-1">
                  {breakdown ? `${formatAmount(breakdown.totalAmount)} сомонӣ` : '—'}
                </td>
              </tr>
            </tbody>
          </table>
          {breakdown && breakdown.lines.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-black/20 px-2 py-1 text-left">{t('allowanceColMonth')}</th>
                  <th className="border border-black/20 px-2 py-1 text-left">{t('allowanceColWorkedDays')}</th>
                  <th className="border border-black/20 px-2 py-1 text-left">{t('allowanceColAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.lines.map((line) => (
                  <tr key={line.month}>
                    <td className="border border-black/20 px-2 py-1">{formatMonth(line.month)}</td>
                    <td className="border border-black/20 px-2 py-1">{line.workedDays}</td>
                    <td className="border border-black/20 px-2 py-1">
                      {formatAmount(line.amount)} сомонӣ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>{t('allowanceDocumentClosing')}</p>
          <OrganizationDocumentSignatureFooter
            director={{ label: directorSignatureLabel, name: organization?.director }}
            accountant={{
              label: accountantSignatureLabel,
              name: organization?.chiefAccountant,
            }}
            sealLabel={t('payrollLedgerSeal')}
          />
        </div>
      </div>
    </section>
  );
}
