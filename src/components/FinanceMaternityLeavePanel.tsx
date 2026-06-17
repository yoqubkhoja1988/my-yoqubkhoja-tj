'use client';

import { leaveMonthsAffected } from '@/lib/finance-labor-leave-pay';
import {
  applyMaternityPeriodToLeave,
  calcMaternityBenefitBreakdown,
  createMaternityLeave,
  MATERNITY_BENEFIT_MONTHS,
} from '@/lib/finance-maternity-leave-pay';
import {
  filterMaternityLeaves,
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
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
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
  MaternityVariant,
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
  onMaternityLeaveSaved?: (month: string) => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

const MATERNITY_VARIANTS: MaternityVariant[] = ['standard', 'complicated', 'multiple'];

function employeeLabel(employee: StaffEmployee) {
  const parts = [employee.fullName];
  if (employee.position) parts.push(`— ${employee.position}`);
  if (employee.personnelNumber) parts.push(`(${employee.personnelNumber})`);
  return parts.join(' ');
}

export default function FinanceMaternityLeavePanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onMaternityLeaveSaved,
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
    () => filterMaternityLeaves(financeContent.laborLeaves),
    [financeContent.laborLeaves]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LaborLeave>(createMaternityLeave());
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
      setDraft(applyMaternityPeriodToLeave(savedLeaves[0]));
      setEditing(false);
      return;
    }
    setSelectedId(null);
    setDraft(
      applyMaternityPeriodToLeave({
        ...createMaternityLeave(),
        orderNumber: nextLaborLeaveOrderNumber(financeContent.laborLeaves),
        reason: t('maternityLeaveDefaultReason'),
      })
    );
    setEditing(true);
  }, [savedLeaves, selectedId, editing, financeContent.laborLeaves, t]);

  function patch<K extends keyof LaborLeave>(field: K, value: LaborLeave[K]) {
    setDraft((current) => {
      let next = { ...current, [field]: value };
      if (
        field === 'expectedBirthDate' ||
        field === 'maternityVariant' ||
        (field === 'startDate' && !current.expectedBirthDate) ||
        (field === 'endDate' && !current.expectedBirthDate)
      ) {
        if (next.expectedBirthDate) {
          next = applyMaternityPeriodToLeave(next);
        }
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
    const month = nextLeave.startDate.slice(0, 7);
    onMaternityLeaveSaved?.(month);
    setSaveNotice(t('maternityLeaveSavedLedgerMonth', { month }));
    return true;
  }

  async function handleSave() {
    if (!draft.employeeId) {
      setError(t('laborLeaveEmployeeRequired'));
      return;
    }
    if (!draft.expectedBirthDate) {
      setError(t('maternityLeaveBirthDateRequired'));
      return;
    }
    const prepared = applyMaternityPeriodToLeave({
      ...draft,
      orderNumber: draft.orderNumber.trim() || nextLaborLeaveOrderNumber(financeContent.laborLeaves),
      substituteEmployeeId: draft.substituteEmployeeId?.trim() || undefined,
      salaryPeriodMonths: MATERNITY_BENEFIT_MONTHS,
      calculationBasis: draft.calculationBasis ?? 'twelve_months',
      lastSalaryRaiseDate:
        draft.calculationBasis === 'since_last_raise'
          ? draft.lastSalaryRaiseDate?.trim() || undefined
          : undefined,
      certificateNumber: draft.certificateNumber?.trim() || undefined,
      reason: draft.reason.trim() || t('maternityLeaveDefaultReason'),
    });
    if (prepared.days <= 0) {
      setError(t('laborLeaveInvalidDates'));
      return;
    }
    await persist(prepared);
  }

  async function handleDelete() {
    if (!selectedId || !confirm(t('confirmDeleteMaternityLeave'))) return;

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
    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    const next = filterMaternityLeaves(saved.laborLeaves);
    if (next.length > 0) {
      setSelectedId(next[0].id);
      setDraft(applyMaternityPeriodToLeave(next[0]));
      setEditing(false);
    } else {
      setSelectedId(null);
      setDraft(
        applyMaternityPeriodToLeave({
          ...createMaternityLeave(),
          orderNumber: nextLaborLeaveOrderNumber(saved.laborLeaves),
          reason: t('maternityLeaveDefaultReason'),
        })
      );
      setEditing(true);
    }
  }

  function handleCreate() {
    setSelectedId(null);
    setDraft(
      applyMaternityPeriodToLeave({
        ...createMaternityLeave(),
        orderNumber: nextLaborLeaveOrderNumber(financeContent.laborLeaves),
        reason: t('maternityLeaveDefaultReason'),
      })
    );
    setEditing(true);
  }

  const employee = employeeMap.get(draft.employeeId);
  const canPrint = Boolean(draft.employeeId && draft.days > 0);
  const benefitBreakdown = useMemo(() => {
    if (!staffContent || !draft.employeeId) return null;
    return calcMaternityBenefitBreakdown(
      applyMaternityPeriodToLeave(draft),
      staffContent,
      financeContent.payrollLedgers
    );
  }, [staffContent, draft, financeContent.payrollLedgers]);

  if (employees.length === 0) {
    return (
      <section id="finance-maternity-leave" className="space-y-4 border-t border-[var(--border)] pt-6">
        <p className="page-eyebrow">{t('financeNavMaternityLeave')}</p>
        <h4 className="text-base font-bold">{t('maternityLeaveTitle')}</h4>
        <p className="text-sm text-[var(--text-muted)]">{t('laborLeaveNeedEmployees')}</p>
      </section>
    );
  }

  return (
    <section id="finance-maternity-leave" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavMaternityLeave')}</p>
          <h4 className="text-base font-bold">{t('maternityLeaveTitle')}</h4>
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
                setDraft(applyMaternityPeriodToLeave(saved));
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
            + {t('maternityLeaveAdd')}
          </button>
          )}
          <button
            type="button"
            onClick={() => printDocument('finance-maternity-leave-document')}
            className="btn-primary text-xs"
            disabled={!canPrint}
          >
            🖨 {t('maternityLeavePrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-maternity-leave-document"
            filename={`homilador-${draft.orderNumber || 'hujjat'}`}
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
                {t('maternityLeaveEdit')}
              </button>
              {selectedId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-danger text-xs"
                  disabled={saving}
                >
                  {t('maternityLeaveDelete')}
                </button>
              )}
            </>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 print:hidden">{error}</p>}
      {saveNotice && (
        <p className="text-sm text-emerald-600 print:hidden">{saveNotice}</p>
      )}

      <p className="text-xs leading-relaxed text-[var(--text-muted)] print:hidden">
        {t('maternityLeaveBenefitHint')}
      </p>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label">{t('maternityLeaveExpectedBirthDate')}</label>
                <input
                  type="date"
                  value={draft.expectedBirthDate ?? ''}
                  onChange={(event) => patch('expectedBirthDate', event.target.value)}
                  className="input-field text-sm"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">{t('maternityLeavePeriodHint')}</p>
              </div>
              <div>
                <label className="field-label">{t('maternityLeaveVariant')}</label>
                <select
                  value={draft.maternityVariant ?? 'standard'}
                  onChange={(event) =>
                    patch('maternityVariant', event.target.value as MaternityVariant)
                  }
                  className="input-field text-sm"
                >
                  {MATERNITY_VARIANTS.map((variant) => (
                    <option key={variant} value={variant}>
                      {t(`maternityLeaveVariant_${variant}`)}
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
                  readOnly={Boolean(draft.expectedBirthDate)}
                />
              </div>
              <div>
                <label className="field-label">{t('laborLeaveEndDate')}</label>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => patch('endDate', event.target.value)}
                  className="input-field text-sm"
                  readOnly={Boolean(draft.expectedBirthDate)}
                />
              </div>
              <div>
                <label className="field-label">{t('laborLeaveDays')}</label>
                <input
                  type="number"
                  min={1}
                  value={draft.days}
                  readOnly
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label">{t('laborLeaveCalculationBasis')}</label>
                <select
                  value={draft.calculationBasis ?? 'twelve_months'}
                  onChange={(event) =>
                    patch('calculationBasis', event.target.value as LaborLeaveCalculationBasis)
                  }
                  className="input-field text-sm"
                >
                  <option value="twelve_months">{t('maternityLeaveBasisThreeMonths')}</option>
                  <option value="since_last_raise">{t('laborLeaveBasisSinceRaise')}</option>
                </select>
              </div>
              {draft.calculationBasis === 'since_last_raise' && (
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

            <div>
              <label className="field-label">{t('maternityLeaveCertificateNumber')}</label>
              <input
                value={draft.certificateNumber ?? ''}
                onChange={(event) => patch('certificateNumber', event.target.value)}
                className="input-field text-sm"
              />
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
                <p className="font-semibold">{t('maternityLeaveBenefitPreview')}</p>
                <p className="mt-1 text-[var(--text-muted)]">
                  {t('maternityLeaveBenefitPreviewText', {
                    months: benefitBreakdown.salaryMonths.length,
                    totalWages: formatAmount(benefitBreakdown.totalWages),
                    workingDays: benefitBreakdown.totalWorkingDays,
                    daily: formatAmount(benefitBreakdown.averageDaily),
                    leaveDays: benefitBreakdown.leaveDays,
                    holidaysExcluded: benefitBreakdown.holidaysExcluded,
                    amount: formatAmount(benefitBreakdown.amount),
                    fallback: benefitBreakdown.usedTariffFallback
                      ? t('laborLeaveTariffFallback')
                      : '',
                    daysBefore: benefitBreakdown.daysBefore,
                    daysAfter: benefitBreakdown.daysAfter,
                  })}
                </p>
              </div>
            )}
          </div>
        )}

        {!editing && benefitBreakdown && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-4 text-xs print:hidden">
            <p className="font-semibold">{t('maternityLeaveBenefitPreview')}</p>
            <p className="mt-1 text-[var(--text-muted)]">
              {formatAmount(benefitBreakdown.amount)} сомонӣ — {benefitBreakdown.leaveDays}{' '}
              {t('laborLeaveDayUnit')}
            </p>
          </div>
        )}

        <div
          id="finance-maternity-leave-document"
          lang="tg"
          className="maternity-leave-document mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none md:p-8"
        >
          <OrganizationReportDocumentHeader
            variant="document"
            showAddress={organization?.address}
          />
          <div className="mb-6 text-center text-xs leading-relaxed text-slate-700">
            <h3 className="mt-4 text-lg font-bold tracking-wide text-slate-900">
              {t('maternityLeaveDocumentTitle')}
            </h3>
            <p className="mt-1 text-sm print-supplement">{t('maternityLeaveDocumentSubtitle')}</p>
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
            {t('maternityLeaveIntro', {
              organization: reportOrganizationName || t('payrollLedgerOrganization'),
              employee: employee?.fullName ?? '________________',
              startDate: formatDate(draft.startDate),
              endDate: formatDate(draft.endDate),
              days: draft.days,
              expectedBirthDate: formatDate(draft.expectedBirthDate ?? ''),
              variant: t(`maternityLeaveVariant_${draft.maternityVariant ?? 'standard'}`),
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
                    {t('maternityLeaveExpectedBirthDate')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {formatDate(draft.expectedBirthDate ?? '')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-semibold">
                    {t('maternityLeaveVariant')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {t(`maternityLeaveVariant_${draft.maternityVariant ?? 'standard'}`)}
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
                <tr>
                  <td className="border border-slate-300 px-3 py-2 font-semibold">
                    {t('maternityLeaveDaysBefore')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {benefitBreakdown?.daysBefore ?? '—'} {t('laborLeaveDayUnit')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-semibold">
                    {t('maternityLeaveDaysAfter')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {benefitBreakdown?.daysAfter ?? '—'} {t('laborLeaveDayUnit')}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 font-semibold">
                    {t('maternityLeaveBenefitPreview')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {benefitBreakdown ? `${formatAmount(benefitBreakdown.amount)} сомонӣ` : '—'}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 font-semibold">
                    {t('maternityLeaveCertificateNumber')}
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {draft.certificateNumber || '—'}
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

          <p className="print-supplement mb-2 text-justify text-xs leading-relaxed text-slate-600 md:text-sm">
            {t('maternityLeaveBenefitHint')}
          </p>

          <p className="mb-8 text-justify text-xs leading-relaxed md:text-sm">
            {t('laborLeaveClosing')}
          </p>

          <OrganizationDocumentSignatureFooter
            director={{ label: directorSignatureLabel, name: organization?.director }}
            accountant={{
              label: accountantSignatureLabel,
              name: organization?.chiefAccountant,
            }}
            sealLabel={t('payrollLedgerSeal')}
            extraRows={[
              [
                { label: t('laborLeaveEmployee'), name: employee?.fullName },
                { label: t('laborLeaveHr') },
              ],
            ]}
          />
        </div>
      </div>
    </section>
  );
}
