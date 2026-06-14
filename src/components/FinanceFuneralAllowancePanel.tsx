'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { formatAppDate } from '@/lib/intl-locale';
import {
  applyFuneralAmountFromLaw,
  calcFuneralAllowanceBreakdown,
  createFuneralAllowance,
  FUNERAL_ALLOWANCE_GOVERNMENT_RESOLUTION,
  FUNERAL_ALLOWANCE_LABOR_CODE_ARTICLES,
  FUNERAL_ALLOWANCE_MULTIPLIER,
  funeralAllowanceMonthKey,
} from '@/lib/finance-funeral-allowance-pay';
import {
  nextFuneralAllowanceOrderNumber,
  removeFuneralAllowance,
  sortFuneralAllowances,
  syncLedgersAfterFuneralAllowanceChange,
  upsertFuneralAllowance,
} from '@/lib/finance-funeral-allowance';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import {
  extractStaffingOptions,
  getPositionsForDepartment,
} from '@/lib/staff-staffing-options';
import { formatAmount } from '@/lib/staff-table-calc';
import { activeEmployees } from '@/lib/staff-timesheet';
import { printDocument } from '@/lib/print-document';
import { Organization } from '@/types/organization';
import {
  FuneralAllowance,
  FuneralAllowanceCaseType,
  FuneralAllowancePaymentSource,
  FuneralDeceasedRelation,
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
  onFuneralAllowanceSaved?: (month: string) => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function employeeLabel(employee: StaffEmployee) {
  const parts = [employee.fullName];
  if (employee.position) parts.push(`— ${employee.position}`);
  if (employee.personnelNumber) parts.push(`(${employee.personnelNumber})`);
  return parts.join(' ');
}

export default function FinanceFuneralAllowancePanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onFuneralAllowanceSaved,
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

  const savedAllowances = useMemo(
    () => sortFuneralAllowances(financeContent.funeralAllowances),
    [financeContent.funeralAllowances]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FuneralAllowance>(createFuneralAllowance());
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
    if (selectedId && savedAllowances.some((item) => item.id === selectedId)) return;
    if (savedAllowances.length > 0) {
      setSelectedId(savedAllowances[0].id);
      setDraft(savedAllowances[0]);
      setEditing(false);
      return;
    }
    setSelectedId(null);
    setDraft({
      ...createFuneralAllowance(),
      orderNumber: nextFuneralAllowanceOrderNumber(financeContent.funeralAllowances),
      reason: t('funeralAllowanceDefaultReason'),
    });
    setEditing(true);
  }, [savedAllowances, selectedId, editing, financeContent.funeralAllowances, t]);

  const breakdown = useMemo(
    () =>
      calcFuneralAllowanceBreakdown(
        draft.paymentDate || draft.preparedAt,
        draft.caseType,
        draft.paymentSource,
        draft.multiplier ?? FUNERAL_ALLOWANCE_MULTIPLIER
      ),
    [draft]
  );

  function patch<K extends keyof FuneralAllowance>(field: K, value: FuneralAllowance[K]) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (
        field === 'paymentDate' ||
        field === 'caseType' ||
        field === 'paymentSource' ||
        field === 'multiplier'
      ) {
        return applyFuneralAmountFromLaw(next);
      }
      return next;
    });
  }

  function applyPayeeEmployee(employeeId: string) {
    const employee = employeeMap.get(employeeId);
    setDraft((current) => ({
      ...current,
      payeeEmployeeId: employeeId,
      payeeFullName: employee?.fullName ?? current.payeeFullName,
      ...(employee
        ? {
            department: employee.department ?? current.department,
            position: employee.position ?? current.position,
          }
        : {}),
    }));
  }

  function applyDeceasedEmployee(employeeId: string) {
    const employee = employeeMap.get(employeeId);
    setDraft((current) => ({
      ...current,
      deceasedEmployeeId: employeeId,
      deceasedFullName: employee?.fullName ?? current.deceasedFullName,
      deceasedRelation: 'employee' as FuneralDeceasedRelation,
      caseType: 'insured_death' as FuneralAllowanceCaseType,
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

  function monthsToSync(
    nextAllowance: FuneralAllowance,
    previousAllowance?: FuneralAllowance
  ): string[] {
    const months = new Set<string>();
    if (
      nextAllowance.paymentSource === 'employer_budget' &&
      nextAllowance.payeeEmployeeId
    ) {
      months.add(funeralAllowanceMonthKey(nextAllowance.paymentDate));
    }
    if (
      previousAllowance?.paymentSource === 'employer_budget' &&
      previousAllowance.payeeEmployeeId
    ) {
      months.add(funeralAllowanceMonthKey(previousAllowance.paymentDate));
    }
    return [...months];
  }

  async function persist(nextAllowance: FuneralAllowance) {
    setSaving(true);
    setError('');

    const previousAllowance = financeContent.funeralAllowances?.find(
      (item) => item.id === nextAllowance.id
    );
    const normalized = applyFuneralAmountFromLaw({
      ...nextAllowance,
      legalBasis:
        nextAllowance.legalBasis?.trim() ||
        `${FUNERAL_ALLOWANCE_LABOR_CODE_ARTICLES}; ${FUNERAL_ALLOWANCE_GOVERNMENT_RESOLUTION}`,
    });
    const nextAllowances = upsertFuneralAllowance(
      financeContent.funeralAllowances,
      normalized
    );
    const payrollLedgers = staffContent
      ? syncLedgersAfterFuneralAllowanceChange(
          financeContent.payrollLedgers,
          nextAllowances,
          staffContent,
          monthsToSync(normalized, previousAllowance),
          financeContent.positionHandovers,
          financeContent.laborLeaves,
          organizationId
        )
      : financeContent.payrollLedgers;

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      funeralAllowances: nextAllowances,
      payrollLedgers,
    };

    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return false;
    }

    onUpdate(saved);
    setSelectedId(normalized.id);
    setDraft(normalized);
    setEditing(false);

    if (
      normalized.paymentSource === 'employer_budget' &&
      normalized.payeeEmployeeId
    ) {
      const month = funeralAllowanceMonthKey(normalized.paymentDate);
      onFuneralAllowanceSaved?.(month);
      setSaveNotice(t('funeralAllowanceSavedLedgerMonth', { month }));
    } else {
      setSaveNotice('');
    }
    return true;
  }

  async function handleSave() {
    if (!draft.deceasedFullName.trim()) {
      setError(t('funeralAllowanceDeceasedRequired'));
      return;
    }
    if (!draft.orderNumber.trim()) {
      setError(t('funeralAllowanceOrderRequired'));
      return;
    }
    if (draft.paymentSource === 'employer_budget' && !draft.payeeEmployeeId) {
      setError(t('funeralAllowancePayeeRequired'));
      return;
    }
    await persist(draft);
  }

  async function handleDelete() {
    if (!selectedId || !confirm(t('confirmDeleteFuneralAllowance'))) return;

    setSaving(true);
    const deleted = financeContent.funeralAllowances?.find((item) => item.id === selectedId);
    const nextAllowances = removeFuneralAllowance(financeContent.funeralAllowances, selectedId);
    const payrollLedgers =
      staffContent && deleted
        ? syncLedgersAfterFuneralAllowanceChange(
            financeContent.payrollLedgers,
            nextAllowances,
            staffContent,
            monthsToSync(deleted),
            financeContent.positionHandovers,
            financeContent.laborLeaves,
            organizationId
          )
        : financeContent.payrollLedgers;

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      funeralAllowances: nextAllowances,
      payrollLedgers,
    };
    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    const next = sortFuneralAllowances(saved.funeralAllowances);
    if (next.length > 0) {
      setSelectedId(next[0].id);
      setDraft(next[0]);
      setEditing(false);
    } else {
      setSelectedId(null);
      setDraft({
        ...createFuneralAllowance(),
        orderNumber: nextFuneralAllowanceOrderNumber(saved.funeralAllowances),
        reason: t('funeralAllowanceDefaultReason'),
      });
      setEditing(true);
    }
  }

  function handleCreate() {
    setSelectedId(null);
    setDraft({
      ...createFuneralAllowance(),
      orderNumber: nextFuneralAllowanceOrderNumber(financeContent.funeralAllowances),
      reason: t('funeralAllowanceDefaultReason'),
    });
    setEditing(true);
  }

  function formatDate(value?: string) {
    if (!value) return '—';
    return formatAppDate(value, locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  const payeeEmployee = draft.payeeEmployeeId
    ? employeeMap.get(draft.payeeEmployeeId)
    : undefined;
  const payeeName =
    payeeEmployee?.fullName ?? draft.payeeFullName?.trim() ?? '________________';
  const canPrint = Boolean(draft.deceasedFullName.trim() && draft.orderNumber.trim());

  return (
    <section
      id="finance-funeral-allowance"
      className="space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavFuneralAllowance')}</p>
          <h4 className="text-base font-bold">{t('funeralAllowanceTitle')}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedAllowances.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(event) => {
                const id = event.target.value;
                const saved = savedAllowances.find((item) => item.id === id);
                if (!saved) return;
                setSelectedId(id);
                setDraft(saved);
                setEditing(false);
              }}
              className="input-field w-auto text-xs"
              disabled={saving || editing}
            >
              {savedAllowances.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.orderNumber} — {item.deceasedFullName} ({formatDate(item.paymentDate)})
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
              {t('funeralAllowanceAdd')}
            </button>
          )}
          {canEdit && selectedId && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-secondary text-xs"
              disabled={saving}
            >
              {t('funeralAllowanceEdit')}
            </button>
          )}
          {canEdit && selectedId && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn-danger text-xs"
              disabled={saving}
            >
              {t('funeralAllowanceDelete')}
            </button>
          )}
          {canPrint && (
            <>
              <button
                type="button"
                onClick={() => printDocument('finance-funeral-allowance-document')}
                className="btn-secondary text-xs"
              >
                {t('funeralAllowancePrint')}
              </button>
              <DocumentExportMenu
                documentId="finance-funeral-allowance-document"
                filename={`funeral-allowance-${draft.orderNumber.replace(/\//g, '-')}`}
              />
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-4 text-xs leading-relaxed print:hidden">
        <p className="font-semibold">{t('funeralAllowanceLegalBasisLabel')}</p>
        <p className="mt-1 text-[var(--text-muted)]">
          {t('funeralAllowanceLegalBasis', {
            articles: FUNERAL_ALLOWANCE_LABOR_CODE_ARTICLES,
            regulation: FUNERAL_ALLOWANCE_GOVERNMENT_RESOLUTION,
          })}
        </p>
        <p className="mt-2 text-[var(--text-muted)]">{t('funeralAllowanceBenefitHint')}</p>
      </div>

      {error && (
        <p className="text-xs text-red-400 print:hidden" role="alert">
          {error}
        </p>
      )}
      {saveNotice && (
        <p className="text-xs text-emerald-400 print:hidden" role="status">
          {saveNotice}
        </p>
      )}

      {editing && canEdit && (
        <div className="space-y-3 rounded-lg border border-[var(--border)] p-4 print:hidden">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="field-label">{t('laborLeaveOrderNumber')}</label>
              <input
                value={draft.orderNumber}
                onChange={(event) => patch('orderNumber', event.target.value)}
                className="input-field text-sm"
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
            <div>
              <label className="field-label">{t('funeralAllowancePaymentDate')}</label>
              <input
                type="date"
                value={draft.paymentDate}
                onChange={(event) => patch('paymentDate', event.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">{t('funeralAllowanceCaseType')}</label>
              <select
                value={draft.caseType}
                onChange={(event) =>
                  patch('caseType', event.target.value as FuneralAllowanceCaseType)
                }
                className="input-field text-sm"
              >
                <option value="insured_death">{t('funeralAllowanceCaseInsuredDeath')}</option>
                <option value="dependent_death">{t('funeralAllowanceCaseDependentDeath')}</option>
              </select>
            </div>
            <div>
              <label className="field-label">{t('funeralAllowancePaymentSource')}</label>
              <select
                value={draft.paymentSource}
                onChange={(event) =>
                  patch('paymentSource', event.target.value as FuneralAllowancePaymentSource)
                }
                className="input-field text-sm"
              >
                <option value="social_insurance">
                  {t('funeralAllowanceSourceSocialInsurance')}
                </option>
                <option value="employer_budget">{t('funeralAllowanceSourceEmployer')}</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="field-label">{t('funeralAllowanceDeceasedEmployee')}</label>
              <select
                value={draft.deceasedEmployeeId ?? ''}
                onChange={(event) => {
                  if (event.target.value) applyDeceasedEmployee(event.target.value);
                  else patch('deceasedEmployeeId', '');
                }}
                className="input-field text-sm"
              >
                <option value="">{t('funeralAllowanceSelectOptional')}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeLabel(employee)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">{t('funeralAllowanceDeceasedName')}</label>
              <input
                value={draft.deceasedFullName}
                onChange={(event) => patch('deceasedFullName', event.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="field-label">{t('funeralAllowanceDeceasedRelation')}</label>
              <select
                value={draft.deceasedRelation}
                onChange={(event) =>
                  patch('deceasedRelation', event.target.value as FuneralDeceasedRelation)
                }
                className="input-field text-sm"
              >
                <option value="employee">{t('funeralAllowanceRelationEmployee')}</option>
                <option value="spouse">{t('funeralAllowanceRelationSpouse')}</option>
                <option value="child">{t('funeralAllowanceRelationChild')}</option>
                <option value="parent">{t('funeralAllowanceRelationParent')}</option>
                <option value="sibling">{t('funeralAllowanceRelationSibling')}</option>
                <option value="other_dependent">
                  {t('funeralAllowanceRelationOtherDependent')}
                </option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="field-label">{t('funeralAllowanceDeathDate')}</label>
              <input
                type="date"
                value={draft.deathDate}
                onChange={(event) => patch('deathDate', event.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="field-label">{t('funeralAllowanceDeathCertificate')}</label>
              <input
                value={draft.deathCertificateNumber ?? ''}
                onChange={(event) => patch('deathCertificateNumber', event.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="field-label">{t('funeralAllowanceLowIncomeCertificate')}</label>
              <input
                value={draft.lowIncomeCertificateNumber ?? ''}
                onChange={(event) => patch('lowIncomeCertificateNumber', event.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="field-label">{t('funeralAllowancePayeeEmployee')}</label>
              <select
                value={draft.payeeEmployeeId ?? ''}
                onChange={(event) => {
                  if (event.target.value) applyPayeeEmployee(event.target.value);
                  else patch('payeeEmployeeId', '');
                }}
                className="input-field text-sm"
              >
                <option value="">{t('funeralAllowanceSelectOptional')}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeLabel(employee)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">{t('funeralAllowancePayeeName')}</label>
              <input
                value={draft.payeeFullName ?? ''}
                onChange={(event) => patch('payeeFullName', event.target.value)}
                className="input-field text-sm"
                readOnly={Boolean(draft.payeeEmployeeId)}
              />
            </div>
            <div>
              <label className="field-label">{t('funeralAllowanceAmount')}</label>
              <input
                value={draft.amount}
                onChange={(event) => patch('amount', event.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
                {positionOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">{t('laborLeaveReason')}</label>
            <input
              value={draft.reason ?? ''}
              onChange={(event) => patch('reason', event.target.value)}
              className="input-field text-sm"
            />
          </div>

          <div className="rounded-md border border-[var(--border)] bg-white/5 p-3 text-xs leading-relaxed">
            <p className="font-semibold">{t('funeralAllowanceBenefitPreview')}</p>
            <p className="mt-1 text-[var(--text-muted)]">
              {t('funeralAllowanceBenefitPreviewText', {
                indicator: breakdown.indicator,
                multiplier: breakdown.multiplier,
                amount: formatAmount(breakdown.amount),
              })}
            </p>
            {draft.paymentSource === 'employer_budget' && (
              <p className="mt-2 text-[var(--text-muted)]">
                {t('funeralAllowanceLedgerHintText')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary text-xs"
              disabled={saving}
            >
              {saving ? t('saving') : t('save')}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={() => {
                  const saved = savedAllowances.find((item) => item.id === selectedId);
                  if (saved) {
                    setDraft(saved);
                    setEditing(false);
                  }
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

      <div
        id="finance-funeral-allowance-document"
        lang="tg"
        className="funeral-allowance-document mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm print:border-0 print:shadow-none md:p-8"
      >
        <OrganizationReportDocumentHeader
          variant="document"
          showAddress={organization?.address}
        />
        <div className="mb-6 text-center text-xs leading-relaxed text-slate-700">
          <h3 className="mt-4 text-lg font-bold tracking-wide text-slate-900">
            {t('funeralAllowanceDocumentTitle')}
          </h3>
          <p className="mt-1 text-sm print-supplement">{t('funeralAllowanceDocumentSubtitle')}</p>
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
          {t('funeralAllowanceIntro', {
            organization: reportOrganizationName || t('payrollLedgerOrganization'),
            deceased: draft.deceasedFullName || '________________',
            deathDate: formatDate(draft.deathDate),
            payee: payeeName,
            amount: draft.amount || formatAmount(breakdown.amount),
            paymentDate: formatDate(draft.paymentDate),
          })}
        </p>

        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <td className="border border-slate-300 px-3 py-2 font-semibold">
                  {t('funeralAllowanceCaseType')}
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {t(`funeralAllowanceCase_${draft.caseType}`)}
                </td>
                <td className="border border-slate-300 px-3 py-2 font-semibold">
                  {t('funeralAllowancePaymentSource')}
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {t(`funeralAllowanceSource_${draft.paymentSource}`)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 font-semibold">
                  {t('funeralAllowanceDeceasedRelation')}
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {t(`funeralAllowanceRelation_${draft.deceasedRelation}`)}
                </td>
                <td className="border border-slate-300 px-3 py-2 font-semibold">
                  {t('funeralAllowanceDeathCertificate')}
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {draft.deathCertificateNumber || '—'}
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
                  {t('funeralAllowanceAmount')}
                </td>
                <td className="border border-slate-300 px-3 py-2 font-semibold">
                  {draft.amount || formatAmount(breakdown.amount)} сомонӣ
                </td>
                <td className="border border-slate-300 px-3 py-2 font-semibold">
                  {t('funeralAllowanceCalculation')}
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  {breakdown.multiplier} × {breakdown.indicator} ={' '}
                  {formatAmount(breakdown.amount)} сомонӣ
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 px-3 py-2 font-semibold">
                  {t('funeralAllowanceLegalBasisLabel')}
                </td>
                <td className="border border-slate-300 px-3 py-2" colSpan={3}>
                  {draft.legalBasis || FUNERAL_ALLOWANCE_LABOR_CODE_ARTICLES}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mb-8 text-justify text-xs leading-relaxed md:text-sm">
          {draft.reason || t('funeralAllowanceDefaultReason')}
        </p>

        <div className="grid gap-8 text-xs md:grid-cols-2">
          <div>
            <p className="font-semibold">{directorSignatureLabel}</p>
            <p className="mt-6 border-t border-slate-400 pt-1">________________</p>
          </div>
          <div>
            <p className="font-semibold">{accountantSignatureLabel}</p>
            <p className="mt-6 border-t border-slate-400 pt-1">________________</p>
          </div>
        </div>
      </div>
    </section>
  );
}
