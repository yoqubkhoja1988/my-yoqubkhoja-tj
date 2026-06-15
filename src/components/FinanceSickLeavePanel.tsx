'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { formatAppDate } from '@/lib/intl-locale';
import { leaveMonthsAffected } from '@/lib/finance-labor-leave-pay';
import {
  filterSickLeaves,
  nextLaborLeaveOrderNumber,
  removeLaborLeave,
  syncLedgersAfterLaborLeaveChange,
  upsertLaborLeave,
} from '@/lib/finance-labor-leave';
import {
  applySickPeriodToLeave,
  calcSickBenefitBreakdown,
  checkSickLeaveDuration,
  createSickLeave,
  SICK_LEAVE_LABOR_CODE_ARTICLES,
  SICK_LEAVE_REGULATION,
  suggestSickBenefitCategory,
} from '@/lib/finance-sick-leave-pay';
import { printDocument } from '@/lib/print-document';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import { updateOrganizationSectionResult } from '@/lib/organization-sections';
import {
  extractStaffingOptions,
  getPositionsForDepartment,
} from '@/lib/staff-staffing-options';
import { formatAmount } from '@/lib/staff-table-calc';
import { activeEmployees } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import {
  LaborLeave,
  OrganizationSectionContent,
  SickLeaveBenefitCategory,
  SickLeaveWageBasis,
  StaffEmployee,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  onSickLeaveSaved?: (month: string) => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function employeeLabel(employee: StaffEmployee) {
  const parts = [employee.fullName];
  if (employee.position) parts.push(`— ${employee.position}`);
  if (employee.personnelNumber) parts.push(`(${employee.personnelNumber})`);
  return parts.join(' ');
}

export default function FinanceSickLeavePanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onSickLeaveSaved,
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
    () => filterSickLeaves(financeContent.laborLeaves),
    [financeContent.laborLeaves]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LaborLeave>(createSickLeave());
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
      setDraft(applySickPeriodToLeave(savedLeaves[0]));
      setEditing(false);
      return;
    }
    setSelectedId(null);
    setDraft(
      applySickPeriodToLeave({
        ...createSickLeave(),
        orderNumber: nextLaborLeaveOrderNumber(financeContent.laborLeaves),
        reason: t('sickLeaveDefaultReason'),
      })
    );
    setEditing(true);
  }, [savedLeaves, selectedId, editing, financeContent.laborLeaves, t]);

  function patch<K extends keyof LaborLeave>(field: K, value: LaborLeave[K]) {
    setDraft((current) => applySickPeriodToLeave({ ...current, [field]: value }));
  }

  function applyEmployee(employeeId: string) {
    const employee = employeeMap.get(employeeId);
    setDraft((current) =>
      applySickPeriodToLeave({
        ...current,
        employeeId,
        ...(employee
          ? {
              department: employee.department ?? current.department,
              position: employee.position ?? current.position,
              sickBenefitCategory: suggestSickBenefitCategory(employee, current.startDate),
            }
          : {}),
      })
    );
  }

  function applyDepartment(value: string) {
    setDraft((current) => {
      const positions = getPositionsForDepartment(staffingDepartments, value);
      return applySickPeriodToLeave({
        ...current,
        department: value,
        position: positions.includes(current.position) ? current.position : '',
      });
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
    for (const month of leaveMonthsAffected(nextLeave)) months.add(month);
    if (previousLeave) {
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
          organizationId
        )
      : financeContent.payrollLedgers;

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      laborLeaves: nextLeaves,
      payrollLedgers,
    };

    const { content: saved, error: saveError } = await updateOrganizationSectionResult(
      organizationId,
      'finance',
      payload
    );
    setSaving(false);

    if (!saved) {
      setError(saveError === 'network_error' ? t('sectionSaveError') : t('sectionSaveErrorDetail', { detail: saveError ?? '' }));
      return false;
    }

    onUpdate(saved);
    setSelectedId(nextLeave.id);
    setDraft(nextLeave);
    setEditing(false);
    const month = nextLeave.startDate.slice(0, 7);
    onSickLeaveSaved?.(month);
    setSaveNotice(t('sickLeaveSavedLedgerMonth', { month }));
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
    if (!draft.certificateNumber?.trim()) {
      setError(t('sickLeaveCertificateRequired'));
      return;
    }
    const prepared = applySickPeriodToLeave({
      ...draft,
      orderNumber: draft.orderNumber.trim() || nextLaborLeaveOrderNumber(financeContent.laborLeaves),
      certificateNumber: draft.certificateNumber.trim(),
      reason: draft.reason.trim() || t('sickLeaveDefaultReason'),
    });
    if (prepared.days <= 0) {
      setError(t('laborLeaveInvalidDates'));
      return;
    }
    await persist(prepared);
  }

  async function handleDelete() {
    if (!selectedId || !confirm(t('confirmDeleteSickLeave'))) return;

    setSaving(true);
    const deleted = financeContent.laborLeaves?.find((item) => item.id === selectedId);
    const nextLeaves = removeLaborLeave(financeContent.laborLeaves, selectedId);
    const payrollLedgers =
      staffContent && deleted
        ? syncLedgersAfterLaborLeaveChange(
            financeContent.payrollLedgers,
            nextLeaves,
            staffContent,
            leaveMonthsAffected(deleted),
            organizationId
          )
        : financeContent.payrollLedgers;
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      laborLeaves: nextLeaves,
      payrollLedgers,
    };
    const { content: saved, error: saveError } = await updateOrganizationSectionResult(
      organizationId,
      'finance',
      payload
    );
    setSaving(false);

    if (!saved) {
      setError(saveError === 'network_error' ? t('sectionSaveError') : t('sectionSaveErrorDetail', { detail: saveError ?? '' }));
      return;
    }

    onUpdate(saved);
    const next = filterSickLeaves(saved.laborLeaves);
    if (next.length > 0) {
      setSelectedId(next[0].id);
      setDraft(applySickPeriodToLeave(next[0]));
      setEditing(false);
    } else {
      setSelectedId(null);
      setDraft(
        applySickPeriodToLeave({
          ...createSickLeave(),
          orderNumber: nextLaborLeaveOrderNumber(saved.laborLeaves),
          reason: t('sickLeaveDefaultReason'),
        })
      );
      setEditing(true);
    }
  }

  function handleCreate() {
    setSelectedId(null);
    setDraft(
      applySickPeriodToLeave({
        ...createSickLeave(),
        orderNumber: nextLaborLeaveOrderNumber(financeContent.laborLeaves),
        reason: t('sickLeaveDefaultReason'),
      })
    );
    setEditing(true);
  }

  const employee = employeeMap.get(draft.employeeId);
  const canPrint = Boolean(draft.employeeId && draft.days > 0);
  const benefitBreakdown = useMemo(() => {
    if (!staffContent || !draft.employeeId) return null;
    return calcSickBenefitBreakdown(
      applySickPeriodToLeave(draft),
      staffContent,
      financeContent.payrollLedgers
    );
  }, [staffContent, draft, financeContent.payrollLedgers]);

  const durationCheck = useMemo(
    () => checkSickLeaveDuration(applySickPeriodToLeave(draft)),
    [draft]
  );

  if (employees.length === 0) {
    return (
      <section id="finance-sick-leave" className="space-y-4 border-t border-[var(--border)] pt-6">
        <p className="page-eyebrow">{t('financeNavSickLeave')}</p>
        <h4 className="text-base font-bold">{t('sickLeaveTitle')}</h4>
        <p className="text-sm text-[var(--text-muted)]">{t('laborLeaveNeedEmployees')}</p>
      </section>
    );
  }

  return (
    <section id="finance-sick-leave" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavSickLeave')}</p>
          <h4 className="text-base font-bold">{t('sickLeaveTitle')}</h4>
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
                setDraft(applySickPeriodToLeave(saved));
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
            + {t('sickLeaveAdd')}
          </button>
          )}
          <button
            type="button"
            onClick={() => printDocument('finance-sick-leave-document')}
            className="btn-primary text-xs"
            disabled={!canPrint}
          >
            🖨 {t('sickLeavePrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-sick-leave-document"
            filename={`kornoshoyam-${draft.orderNumber || 'hujjat'}`}
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
              {saving ? t('saving') : t('save')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary text-xs"
                disabled={saving}
              >
                {t('sickLeaveEdit')}
              </button>
              {selectedId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-danger text-xs"
                  disabled={saving}
                >
                  {t('sickLeaveDelete')}
                </button>
              )}
            </>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 print:hidden">{error}</p>}
      {saveNotice && <p className="text-sm text-emerald-600 print:hidden">{saveNotice}</p>}

      <p className="text-xs leading-relaxed text-[var(--text-muted)] print:hidden">
        {t('sickLeaveBenefitHint')}
      </p>
      <p className="text-xs leading-relaxed text-[var(--text-muted)] print:hidden">
        {t('sickLeaveLegalBasis', {
          regulation: SICK_LEAVE_REGULATION,
          articles: SICK_LEAVE_LABOR_CODE_ARTICLES,
        })}
      </p>
      {durationCheck.exceedsLimit && (
        <p className="text-xs text-amber-600 print:hidden">
          {t('sickLeaveDurationWarning', { max: durationCheck.maxMonths })}
        </p>
      )}

      <div className="space-y-4">
        {editing && (
          <div className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-4 print:hidden">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label">{t('employeeDepartment')}</label>
                <select
                  value={draft.department}
                  onChange={(event) => applyDepartment(event.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">—</option>
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
                  <option value="">—</option>
                  {positionOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">{t('sickLeaveCertificateNumber')}</label>
              <input
                value={draft.certificateNumber ?? ''}
                onChange={(event) => patch('certificateNumber', event.target.value)}
                className="input-field text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label">{t('sickLeaveWageBasis')}</label>
                <select
                  value={draft.sickWageBasis ?? 'time_rate'}
                  onChange={(event) =>
                    patch('sickWageBasis', event.target.value as SickLeaveWageBasis)
                  }
                  className="input-field text-sm"
                >
                  <option value="time_rate">{t('sickLeaveWageBasisTimeRate')}</option>
                  <option value="premium">{t('sickLeaveWageBasisPremium')}</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t('sickLeaveBenefitCategory')}</label>
                <select
                  value={draft.sickBenefitCategory ?? 'experience_under_8'}
                  onChange={(event) =>
                    patch('sickBenefitCategory', event.target.value as SickLeaveBenefitCategory)
                  }
                  className="input-field text-sm"
                >
                  <option value="experience_under_8">{t('sickLeaveCategoryUnder8')}</option>
                  <option value="experience_8_plus">{t('sickLeaveCategory8Plus')}</option>
                  <option value="dependents_3_plus">{t('sickLeaveCategoryDependents')}</option>
                  <option value="orphan_under_23">{t('sickLeaveCategoryOrphan')}</option>
                  <option value="occupational_injury">{t('sickLeaveCategoryInjury')}</option>
                  <option value="professional_disease">{t('sickLeaveCategoryProfession')}</option>
                  <option value="war_participant">{t('sickLeaveCategoryWar')}</option>
                  <option value="manual">{t('sickLeaveCategoryManual')}</option>
                </select>
              </div>
            </div>

            {draft.sickBenefitCategory === 'manual' && (
              <div>
                <label className="field-label">{t('sickLeaveBenefitPercent')}</label>
                <input
                  type="number"
                  min={60}
                  max={100}
                  value={draft.sickBenefitPercent ?? 60}
                  onChange={(event) =>
                    patch('sickBenefitPercent', Number(event.target.value) || 60)
                  }
                  className="input-field text-sm"
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm print:hidden">
              <input
                type="checkbox"
                checked={Boolean(draft.sickIsTuberculosis)}
                onChange={(event) => patch('sickIsTuberculosis', event.target.checked)}
              />
              {t('sickLeaveTuberculosis')}
            </label>

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
                <label className="field-label">{t('sickLeaveWorkingDays')}</label>
                <input type="number" min={1} value={draft.days} readOnly className="input-field text-sm" />
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

            {benefitBreakdown && (
              <div className="rounded-md border border-[var(--border)] bg-white/5 p-3 text-xs leading-relaxed">
                <p className="font-semibold">{t('sickLeaveBenefitPreview')}</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  {t('sickLeaveBenefitPreviewText', {
                    monthlyWage: formatAmount(benefitBreakdown.monthlyWage),
                    percent: benefitBreakdown.benefitPercent,
                    workingDays: benefitBreakdown.normWorkingDays,
                    daily: formatAmount(benefitBreakdown.dailyBenefit),
                    sickDays: benefitBreakdown.sickWorkingDays,
                    amount: formatAmount(benefitBreakdown.amount),
                    capNote: benefitBreakdown.wageCapped ? t('sickLeaveWageCappedNote') : '',
                    floorNote: benefitBreakdown.minFloorApplied ? t('sickLeaveMinFloorNote') : '',
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {!editing && benefitBreakdown && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-input)]/30 p-3 text-xs print:hidden">
            <p className="font-semibold">{t('sickLeaveBenefitPreview')}</p>
            <p className="mt-1 text-[var(--text-muted)]">
              {formatAmount(benefitBreakdown.amount)} {t('staffCurrency')}
            </p>
          </div>
        )}

        <div
          id="finance-sick-leave-document"
          lang="tg"
          className="sick-leave-document mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none md:p-8"
        >
          <OrganizationReportDocumentHeader
            variant="document"
            showAddress={organization?.address}
          />
          <div className="mb-6 text-center text-xs leading-relaxed text-slate-700">
            <h3 className="mt-4 text-lg font-bold tracking-wide text-slate-900">
              {t('sickLeaveDocumentTitle')}
            </h3>
            <p className="mt-1 text-sm print-supplement">{t('sickLeaveDocumentSubtitle')}</p>
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
            {t('sickLeaveIntro', {
              organization: reportOrganizationName || t('payrollLedgerOrganization'),
              employee: employee?.fullName ?? '________________',
              startDate: formatDate(draft.startDate),
              endDate: formatDate(draft.endDate),
              days: draft.days,
              certificate: draft.certificateNumber || '—',
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
                    {t('sickLeaveCertificateNumber')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                    {draft.certificateNumber || '—'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 font-semibold">
                    {t('laborLeavePeriod')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                    {formatDate(draft.startDate)} — {formatDate(draft.endDate)} ({draft.days}{' '}
                    {t('laborLeaveDayUnit')})
                  </td>
                </tr>
                {benefitBreakdown && (
                  <tr>
                    <td className="border border-slate-300 px-3 py-2 font-semibold">
                      {t('sickLeaveBenefitPreview')}
                    </td>
                    <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                      {formatAmount(benefitBreakdown.amount)} {t('staffCurrency')} ({' '}
                      {benefitBreakdown.benefitPercent}%) — {t('sickLeaveBenefitFormulaShort')}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="border border-slate-300 px-3 py-2 font-semibold">
                    {t('sickLeaveLegalBasisLabel')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-xs leading-relaxed" colSpan={3}>
                    {SICK_LEAVE_REGULATION}; {SICK_LEAVE_LABOR_CODE_ARTICLES}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 print-supplement">
            {t('sickLeaveBenefitHint')}
          </p>

          <div className="mt-10 grid gap-8 text-xs text-slate-700 md:grid-cols-2">
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
          </div>
        </div>
      </div>
    </section>
  );
}
