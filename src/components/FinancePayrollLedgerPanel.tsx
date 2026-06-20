'use client';

import { getDirectorSignatureLabel, isBudgetFundedOrganization } from '@/lib/organization-scope';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import {
  calcEntryTotals,
  formatLedgerAmount,
  hasStoredPayrollLedger,
  mergePayrollLedgerForMonth,
  payrollLedgerPersonGroupKey,
  recalculatePayrollLedger,
  recomputeEntryIncomeTax,
  calcLedgerHamagi,
  removePayrollLedger,
  persistPayrollLedgerInFinance,
  removePayrollLedgerInFinance,
  resolveEmploymentWorkType,
  resolvePayrollLedgerMonth,
} from '@/lib/finance-payroll-ledger';
import {
  mergeAssignmentWithholdings,
  resolvePayrollWithholdings,
  splitVisiblePayrollWithholdings,
  withholdingAmount,
} from '@/lib/finance-payroll-withholdings';
import { summarizePayrollLedger } from '@/lib/payroll-accounting';
import {
  fetchOrganizationSection,
  updateOrganizationSection,
} from '@/lib/organization-sections';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { formatAppDate } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  activeEmployees,
  countNormWorkingDays,
  countPayrollWorkedDays,
  currentMonthKey,
  formatMonthLabel,
  mergeTimesheetForMonth,
  shiftMonth,
} from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import {
  OrganizationSectionContent,
  PayrollLedger,
  PayrollLedgerEntry,
  StaffEmployee,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  preferredMonth?: string | null;
  onPreferredMonthApplied?: () => void;
  onStaffRefreshed?: (content: OrganizationSectionContent) => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function AmountInput({
  editing,
  value,
  onChange,
}: {
  editing: boolean;
  value: string;
  onChange?: (value: string) => void;
}) {
  if (!editing || !onChange) {
    return <span>{formatLedgerAmount(parseAmount(value) ?? 0)}</span>;
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border-b border-slate-300 bg-transparent px-1 py-0.5 text-center text-xs outline-none"
    />
  );
}

export default function FinancePayrollLedgerPanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  preferredMonth,
  onPreferredMonthApplied,
  onStaffRefreshed,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
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

  const [month, setMonth] = useState(() => resolvePayrollLedgerMonth(financeContent));
  const [ledger, setLedger] = useState<PayrollLedger>({ month: currentMonthKey(), entries: [] });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const withholdingTypes = useMemo(
    () => resolvePayrollWithholdings(financeContent),
    [financeContent.payrollWithholdingTypes]
  );

  const { preTax: visiblePreTaxWithholdings, postTax: visiblePostTaxWithholdings } = useMemo(
    () => splitVisiblePayrollWithholdings(withholdingTypes, ledger, editing),
    [withholdingTypes, ledger, editing]
  );

  const accruedSubCols = 3 + visiblePreTaxWithholdings.length + 1;
  const deductionSubCols = 3 + visiblePostTaxWithholdings.length + 2;

  const ledgerBuildContext = useMemo(
    () => ({
      organizationId,
      positionHandovers: financeContent.positionHandovers,
      salaryAllowanceAdjustments: financeContent.salaryAllowanceAdjustments,
      laborLeaves: financeContent.laborLeaves,
      payrollLedgers: financeContent.payrollLedgers,
      payrollWithholdingTypes: withholdingTypes,
      payrollWithholdingAssignments: financeContent.payrollWithholdingAssignments,
    }),
    [
      organizationId,
      financeContent.positionHandovers,
      financeContent.salaryAllowanceAdjustments,
      financeContent.laborLeaves,
      financeContent.payrollLedgers,
      financeContent.payrollWithholdingAssignments,
      withholdingTypes,
    ]
  );

  useEffect(() => {
    if (!preferredMonth) return;
    setMonth(preferredMonth);
    onPreferredMonthApplied?.();
    document.getElementById('finance-payroll-ledger')?.scrollIntoView({ behavior: 'smooth' });
  }, [preferredMonth, onPreferredMonthApplied]);

  useEffect(() => {
    if (!staffContent) return;
    const merged = mergePayrollLedgerForMonth(
      financeContent.payrollLedgers,
      month,
      staffContent,
      ledgerBuildContext
    );
    setLedger(merged);
    setEditing(!hasStoredPayrollLedger(financeContent.payrollLedgers, month));
  }, [
    financeContent.payrollLedgers,
    financeContent.positionHandovers,
    financeContent.salaryAllowanceAdjustments,
    financeContent.laborLeaves,
    financeContent.payrollWithholdingTypes,
    staffContent,
    staffContent?.timesheets,
    month,
    ledgerBuildContext,
  ]);

  const monthLabel = formatMonthLabel(month, locale);
  const preparedAt = formatAppDate(ledger.preparedAt ?? Date.now(), locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const rows = useMemo(
    () => {
      type GroupRow = {
        key: string;
        employees: StaffEmployee[];
        entryIds: string[];
        entry: PayrollLedgerEntry;
        totals: ReturnType<typeof calcEntryTotals>;
      };

      function sumEntryValues(entries: PayrollLedgerEntry[]): PayrollLedgerEntry {
        const total = {
          baseSalary: 0,
          allowances: 0,
          laborLeavePay: 0,
          fhea: 0,
          kik: 0,
          hhdt: 0,
          tax: 0,
        };

        for (const item of entries) {
          total.baseSalary += parseAmount(item.baseSalary) ?? 0;
          total.allowances += parseAmount(item.allowances) ?? 0;
          total.laborLeavePay += parseAmount(item.laborLeavePay ?? '') ?? 0;
          total.fhea += parseAmount(item.fhea) ?? 0;
          total.kik += parseAmount(item.kik) ?? 0;
          total.hhdt += parseAmount(item.hhdt) ?? 0;
          total.tax += parseAmount(item.tax) ?? 0;
        }

        const withholdingAmounts: Record<string, string> = {};
        for (const type of withholdingTypes) {
          withholdingAmounts[type.id] = formatAmount(
            entries.reduce((sum, item) => sum + withholdingAmount(item, type.id), 0)
          );
        }

        return {
          employeeId: entries[0]?.employeeId ?? '',
          baseSalary: formatAmount(total.baseSalary),
          allowances: formatAmount(total.allowances),
          laborLeavePay: formatAmount(total.laborLeavePay),
          fhea: formatAmount(total.fhea),
          kik: formatAmount(total.kik),
          hhdt: formatAmount(total.hhdt),
          tax: formatAmount(total.tax),
          withholdingAmounts,
        };
      }

      const grouped = new Map<string, GroupRow>();

      for (const sourceEntry of ledger.entries) {
        const employee = employeeMap.get(sourceEntry.employeeId);
        if (!employee) continue;
        const key = payrollLedgerPersonGroupKey(employee);
        const existing = grouped.get(key);
        if (!existing) {
          grouped.set(key, {
            key,
            employees: [employee],
            entryIds: [sourceEntry.employeeId],
            entry: sourceEntry,
            totals: calcEntryTotals(sourceEntry, withholdingTypes),
          });
          continue;
        }

        const employees = [...existing.employees, employee];
        const entryIds = [...existing.entryIds, sourceEntry.employeeId];
        const mergedEntries = [existing.entry, sourceEntry];
        const mergedEntry = sumEntryValues(mergedEntries);

        grouped.set(key, {
          key,
          employees,
          entryIds,
          entry: mergedEntry,
          totals: calcEntryTotals(mergedEntry, withholdingTypes),
        });
      }

      return [...grouped.values()];
    },
    [ledger.entries, employeeMap, withholdingTypes]
  );

  const summary = useMemo(() => {
    const totals = rows.map((row) => row.totals);
    return {
      gross: totals.reduce((sum, item) => sum + item.gross, 0),
      preTaxOther: totals.reduce((sum, item) => sum + item.preTaxOther, 0),
      postTaxOther: totals.reduce((sum, item) => sum + item.postTaxOther, 0),
      allowances: totals.reduce((sum, item) => sum + item.allowances, 0),
      laborLeavePay: totals.reduce((sum, item) => sum + item.laborLeavePay, 0),
      baseSalary: totals.reduce((sum, item) => sum + item.baseSalary, 0),
      fhea: totals.reduce((sum, item) => sum + item.fhea, 0),
      kik: totals.reduce((sum, item) => sum + item.kik, 0),
      hhdt: totals.reduce((sum, item) => sum + item.hhdt, 0),
      tax: totals.reduce((sum, item) => sum + item.tax, 0),
      deductions: totals.reduce((sum, item) => sum + item.deductions, 0),
      netPay: totals.reduce((sum, item) => sum + item.netPay, 0),
    };
  }, [rows]);

  const payrollAccountingSummary = useMemo(
    () => summarizePayrollLedger(ledger, withholdingTypes),
    [ledger, withholdingTypes]
  );

  const showEmployerCharges = isBudgetFundedOrganization(organizationId);

  function patchEntry(employeeId: string, field: keyof PayrollLedgerEntry, value: string) {
    const affectsHamagi =
      field === 'baseSalary' || field === 'allowances' || field === 'laborLeavePay';

    setLedger((current) => ({
      ...current,
      entries: current.entries.map((entry) => {
        if (entry.employeeId !== employeeId) return entry;
        const next = { ...entry, [field]: value };
        if (!affectsHamagi || !staffContent) return next;

        const employee = employeeMap.get(employeeId);
        if (!employee) return next;

        const timesheet = mergeTimesheetForMonth(
          staffContent.timesheets,
          month,
          staffContent.employees ?? []
        );
        const sheetEntry = timesheet.entries.find((item) => item.employeeId === employeeId);
        const workedDays = sheetEntry
          ? countPayrollWorkedDays(sheetEntry, month, {
              laborLeaves: financeContent.laborLeaves,
              employeeId,
            })
          : 0;
        const normDays = countNormWorkingDays(month);
        const rawGross =
          (parseAmount(next.baseSalary) ?? 0) +
          (parseAmount(next.allowances) ?? 0) +
          (parseAmount(next.laborLeavePay ?? '') ?? 0);
        const merged = mergeAssignmentWithholdings(
          next,
          financeContent.payrollWithholdingAssignments,
          month,
          withholdingTypes,
          rawGross
        );
        const hamagi = calcLedgerHamagi(merged, rawGross, withholdingTypes);
        const workType = resolveEmploymentWorkType(employee);
        const updated: PayrollLedgerEntry = {
          ...merged,
          fhea: formatAmount(hamagi * 0.01),
          kik: formatAmount(hamagi * 0.01),
          hhdt: formatAmount(hamagi * 0.01),
          tax: recomputeEntryIncomeTax(
            merged,
            rawGross,
            workedDays,
            normDays,
            workType,
            withholdingTypes
          ),
        };

        return updated;
      }),
    }));
  }

  function patchWithholding(employeeId: string, typeId: string, value: string) {
    if (!staffContent) return;
    const withholdingType = withholdingTypes.find((item) => item.id === typeId);
    const timesheet = mergeTimesheetForMonth(
      staffContent.timesheets,
      month,
      staffContent.employees ?? []
    );
    const sheetEntry = timesheet.entries.find((item) => item.employeeId === employeeId);
    const workedDays = sheetEntry
      ? countPayrollWorkedDays(sheetEntry, month, {
          laborLeaves: financeContent.laborLeaves,
          employeeId,
        })
      : 0;
    const normDays = countNormWorkingDays(month);

    setLedger((current) => ({
      ...current,
      entries: current.entries.map((entry) => {
        if (entry.employeeId !== employeeId) return entry;
        const next: PayrollLedgerEntry = {
          ...entry,
          withholdingAmounts: {
            ...(entry.withholdingAmounts ?? {}),
            [typeId]: value,
          },
        };
        const rawGross =
          (parseAmount(next.baseSalary) ?? 0) +
          (parseAmount(next.allowances) ?? 0) +
          (parseAmount(next.laborLeavePay ?? '') ?? 0);
        const merged = mergeAssignmentWithholdings(
          next,
          financeContent.payrollWithholdingAssignments,
          month,
          withholdingTypes,
          rawGross
        );
        if (withholdingType?.timing !== 'pre_tax') return merged;
        const employee = employeeMap.get(employeeId);
        if (!employee) return merged;
        const { gross: hamagi } = calcEntryTotals(merged, withholdingTypes);
        const workType = resolveEmploymentWorkType(employee);
        return {
          ...merged,
          fhea: formatAmount(hamagi * 0.01),
          kik: formatAmount(hamagi * 0.01),
          hhdt: formatAmount(hamagi * 0.01),
          tax: recomputeEntryIncomeTax(
            merged,
            rawGross,
            workedDays,
            normDays,
            workType,
            withholdingTypes
          ),
        };
      }),
    }));
  }

  async function persist(nextLedger: PayrollLedger) {
    setSaving(true);
    setError('');

    const { content: payload } = persistPayrollLedgerInFinance(
      {
        ...financeContent,
        summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      },
      nextLedger
    );

    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    setEditing(false);
  }

  async function handleSave() {
    if (!staffContent) return;
    const nextLedger = {
      ...recalculatePayrollLedger(ledger, staffContent, ledgerBuildContext),
      preparedAt: new Date().toISOString().slice(0, 10),
    };
    setLedger(nextLedger);
    await persist(nextLedger);
  }

  async function handleRefresh() {
    setSaving(true);
    setError('');

    const [freshStaff, freshFinance] = await Promise.all([
      fetchOrganizationSection(organizationId, 'staff'),
      fetchOrganizationSection(organizationId, 'finance'),
    ]);

    if (!freshStaff) {
      setSaving(false);
      setError(t('sectionSaveError'));
      return;
    }

    onStaffRefreshed?.(freshStaff);
    const financeBase = freshFinance ?? financeContent;
    if (freshFinance) onUpdate(freshFinance);

    const merged = mergePayrollLedgerForMonth(
      financeBase.payrollLedgers,
      month,
      freshStaff,
      {
        organizationId,
        positionHandovers: financeBase.positionHandovers,
        salaryAllowanceAdjustments: financeBase.salaryAllowanceAdjustments,
        laborLeaves: financeBase.laborLeaves,
        payrollLedgers: financeBase.payrollLedgers,
        payrollWithholdingTypes: resolvePayrollWithholdings(financeBase),
        payrollWithholdingAssignments: financeBase.payrollWithholdingAssignments,
      }
    );
    setLedger(merged);

    if (hasStoredPayrollLedger(financeBase.payrollLedgers, month)) {
      setSaving(true);
      const { content: payload } = persistPayrollLedgerInFinance(
        {
          ...financeBase,
          summary: financeBase.summary?.trim() || t('financeDefaultSummary'),
        },
        merged
      );
      const saved = await updateOrganizationSection(organizationId, 'finance', payload);
      setSaving(false);
      if (!saved) {
        setError(t('sectionSaveError'));
        return;
      }
      onUpdate(saved);
      setEditing(false);
    } else {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t('confirmDeletePayrollLedger'))) return;

    setSaving(true);
    const payload = removePayrollLedgerInFinance(
      {
        ...financeContent,
        summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      },
      month,
      organizationId
    );

    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    if (staffContent) {
      setLedger(
        mergePayrollLedgerForMonth(saved.payrollLedgers, month, staffContent, {
          organizationId,
          positionHandovers: saved.positionHandovers,
          salaryAllowanceAdjustments: saved.salaryAllowanceAdjustments,
          laborLeaves: saved.laborLeaves,
          payrollLedgers: saved.payrollLedgers,
          payrollWithholdingTypes: resolvePayrollWithholdings(saved),
        })
      );
    }
    setEditing(true);
  }

  return (
    <section id="finance-payroll-ledger" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavPayrollLedger')}</p>
          <h4 className="text-base font-bold">{t('payrollLedgerTitle')}</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            className="btn-secondary px-2 py-1 text-xs"
            disabled={saving}
          >
            ←
          </button>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="input-field w-auto text-xs"
          />
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            className="btn-secondary px-2 py-1 text-xs"
            disabled={saving}
          >
            →
          </button>
          {canEdit && staffContent && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="btn-secondary text-xs"
              disabled={saving}
            >
              {t('payrollLedgerRefresh')}
            </button>
          )}
          <button
            type="button"
            onClick={() => printDocument('finance-payroll-ledger-document')}
            className="btn-primary text-xs"
            disabled={!rows.length}
          >
            🖨 {t('payrollLedgerPrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-payroll-ledger-document"
            filename={`kitob-muzd-${month}`}
            disabled={!rows.length}
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
                {t('payrollLedgerEdit')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger text-xs"
                disabled={saving}
              >
                {t('payrollLedgerDelete')}
              </button>
            </>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300 print:hidden">
          {error}
        </p>
      )}

      {!staffContent ? (
        <p className="text-xs text-[var(--text-muted)]">{t('financePayrollNoStaff')}</p>
      ) : !rows.length ? (
        <p className="text-xs text-[var(--text-muted)]">{t('payrollLedgerNoEmployees')}</p>
      ) : (
        <div className="payroll-ledger-scroll w-full overflow-x-auto print:overflow-visible">
        <div
          id="finance-payroll-ledger-document"
          lang="tg"
          className="payroll-ledger-document mx-auto min-w-[72rem] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:min-w-0 print:border-0 print:p-2 print:shadow-none md:p-6"
        >
          <OrganizationReportDocumentHeader
            variant="document"
            showAddress={organization?.address}
          />
          <div className="mb-6 text-center text-xs leading-relaxed text-slate-700">
            <h3 className="text-lg font-bold tracking-wide text-slate-900">
              {t('payrollLedgerDocumentTitle')}
            </h3>
            <p className="mt-1 text-sm">
              {t('payrollLedgerForMonth', { month: monthLabel })}
            </p>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[68rem] border-collapse text-[10px] md:text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th rowSpan={2} className="border border-slate-300 px-2 py-2">
                    №
                  </th>
                  <th rowSpan={2} className="min-w-[10rem] border border-slate-300 px-2 py-2">
                    {t('payrollLedgerColName')}
                  </th>
                  <th rowSpan={2} className="border border-slate-300 px-2 py-2">
                    {t('payrollLedgerColTabNo')}
                  </th>
                  <th rowSpan={2} className="min-w-[8rem] border border-slate-300 px-2 py-2">
                    {t('payrollLedgerColPosition')}
                  </th>
                  <th colSpan={accruedSubCols} className="border border-slate-300 px-2 py-2">
                    {t('payrollLedgerColAccrued')}
                  </th>
                  <th colSpan={deductionSubCols} className="border border-slate-300 px-2 py-2">
                    {t('payrollLedgerColDeductions')}
                  </th>
                  <th rowSpan={2} className="border border-slate-300 px-2 py-2">
                    {t('payrollLedgerColNet')}
                  </th>
                </tr>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerColBase')}</th>
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerColBonus')}</th>
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerColLaborLeave')}</th>
                  {visiblePreTaxWithholdings.map((type) => (
                    <th
                      key={type.id}
                      className="min-w-[5rem] border border-slate-300 px-2 py-2"
                      title={type.legalBasis}
                    >
                      <span className="block">{type.name}</span>
                      <span className="mt-0.5 block text-[9px] font-normal text-slate-500">
                        {t('payrollWithholdingsTimingPreTaxShort')}
                      </span>
                    </th>
                  ))}
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerColGross')}</th>
                  <th className="border border-slate-300 px-2 py-2">ФҲИА</th>
                  <th className="border border-slate-300 px-2 py-2">КИК</th>
                  <th className="border border-slate-300 px-2 py-2">ҲҲДТ</th>
                  {visiblePostTaxWithholdings.map((type) => (
                    <th
                      key={type.id}
                      className="min-w-[5rem] border border-slate-300 px-2 py-2"
                      title={type.legalBasis}
                    >
                      <span className="block">{type.name}</span>
                      <span className="mt-0.5 block text-[9px] font-normal text-slate-500">
                        {t('payrollWithholdingsTimingPostTaxShort')}
                      </span>
                    </th>
                  ))}
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerColTax')}</th>
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, entry, employees: groupedEmployees, entryIds, totals }, index) => {
                  const mainEmployee = groupedEmployees[0];
                  const positions = [...new Set(groupedEmployees.map((item) => item.position).filter(Boolean))];
                  const personnelNumbers = [
                    ...new Set(groupedEmployees.map((item) => item.personnelNumber).filter(Boolean)),
                  ];
                  const isMultiPosition = positions.length > 1;
                  const anySecondary = groupedEmployees.some(
                    (item) => resolveEmploymentWorkType(item) === 'secondary'
                  );
                  const canPatch = editing && entryIds.length === 1;

                  return (
                  <tr key={key}>
                    <td className="border border-slate-300 px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-slate-300 px-2 py-2 font-medium">
                      {mainEmployee.fullName}
                      {anySecondary && (
                        <span className="mt-0.5 block text-[9px] font-semibold uppercase text-amber-700">
                          {t('employmentWorkTypeSecondaryShort')}
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      {personnelNumbers.length > 0 ? personnelNumbers.join(', ') : '—'}
                    </td>
                    <td className="border border-slate-300 px-2 py-2">
                      {positions.join(', ') || '—'}
                      {isMultiPosition && (
                        <span className="mt-0.5 block text-[9px] uppercase text-[var(--text-muted)]">
                          {entryIds.length} {t('employeePosition')}
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      <AmountInput
                        editing={canPatch}
                        value={entry.baseSalary}
                        onChange={
                          canPatch
                            ? (value) => patchEntry(entryIds[0], 'baseSalary', value)
                            : undefined
                        }
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      <AmountInput
                        editing={canPatch}
                        value={entry.allowances}
                        onChange={
                          canPatch
                            ? (value) => patchEntry(entryIds[0], 'allowances', value)
                            : undefined
                        }
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      <AmountInput
                        editing={canPatch}
                        value={entry.laborLeavePay ?? '0,00'}
                        onChange={
                          canPatch
                            ? (value) => patchEntry(entryIds[0], 'laborLeavePay', value)
                            : undefined
                        }
                      />
                    </td>
                    {visiblePreTaxWithholdings.map((type) => (
                      <td key={type.id} className="border border-slate-300 px-2 py-2 text-center">
                        <AmountInput
                          editing={canPatch}
                          value={entry.withholdingAmounts?.[type.id] ?? '0,00'}
                          onChange={
                            canPatch
                              ? (value) => patchWithholding(entryIds[0], type.id, value)
                              : undefined
                          }
                        />
                      </td>
                    ))}
                    <td className="border border-slate-300 px-2 py-2 text-center font-semibold">
                      {formatLedgerAmount(totals.gross)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      <AmountInput
                        editing={canPatch}
                        value={entry.fhea}
                        onChange={canPatch ? (value) => patchEntry(entryIds[0], 'fhea', value) : undefined}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      <AmountInput
                        editing={canPatch}
                        value={entry.kik}
                        onChange={canPatch ? (value) => patchEntry(entryIds[0], 'kik', value) : undefined}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      <AmountInput
                        editing={canPatch}
                        value={entry.hhdt}
                        onChange={canPatch ? (value) => patchEntry(entryIds[0], 'hhdt', value) : undefined}
                      />
                    </td>
                    {visiblePostTaxWithholdings.map((type) => (
                      <td key={type.id} className="border border-slate-300 px-2 py-2 text-center">
                        <AmountInput
                          editing={canPatch}
                          value={entry.withholdingAmounts?.[type.id] ?? '0,00'}
                          onChange={
                            canPatch
                              ? (value) => patchWithholding(entryIds[0], type.id, value)
                              : undefined
                          }
                        />
                      </td>
                    ))}
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      <AmountInput
                        editing={canPatch}
                        value={entry.tax}
                        onChange={canPatch ? (value) => patchEntry(entryIds[0], 'tax', value) : undefined}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-semibold">
                      {formatLedgerAmount(totals.deductions)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-bold text-emerald-700">
                      {formatLedgerAmount(totals.netPay)}
                    </td>
                  </tr>
                )})}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="border border-slate-300 px-2 py-2 text-center">
                    {t('payrollLedgerTotal')}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.baseSalary)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.allowances)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.laborLeavePay)}
                  </td>
                  {visiblePreTaxWithholdings.map((type) => (
                    <td key={type.id} className="border border-slate-300 px-2 py-2 text-center">
                      {formatLedgerAmount(
                        rows.reduce(
                          (sum, row) => sum + withholdingAmount(row.entry, type.id),
                          0
                        )
                      )}
                    </td>
                  ))}
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.gross)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.fhea)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.kik)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.hhdt)}
                  </td>
                  {visiblePostTaxWithholdings.map((type) => (
                    <td key={type.id} className="border border-slate-300 px-2 py-2 text-center">
                      {formatLedgerAmount(
                        rows.reduce(
                          (sum, row) => sum + withholdingAmount(row.entry, type.id),
                          0
                        )
                      )}
                    </td>
                  ))}
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.tax)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatLedgerAmount(summary.deductions)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center text-emerald-700">
                    {formatLedgerAmount(summary.netPay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 space-y-1 text-xs text-slate-700">
            <p>
              Шумораи кормандон:{' '}
              <strong>
                {rows.length} нафар
              </strong>
            </p>
            <p>
              {t('payrollLedgerTotalDeductions')}:{' '}
              <strong>{formatLedgerAmount(summary.deductions)}</strong> {t('staffCurrency')}
            </p>
            <p>
              {t('payrollLedgerTotalNet')}:{' '}
              <strong>{formatLedgerAmount(summary.netPay)}</strong> {t('staffCurrency')}
            </p>
            <p>
              {t('payrollLedgerPreparedAt')}: <strong>{preparedAt}</strong>
            </p>
            {showEmployerCharges && (
              <>
                <p>
                  ФҲИА 25% (корфармо):{' '}
                  <strong>{formatLedgerAmount(payrollAccountingSummary.employerFhea25)}</strong>{' '}
                  {t('staffCurrency')}
                </p>
                <p>
                  Санаторияи истироҳатӣ 1,5% аз ФҲИА:{' '}
                  <strong>{formatLedgerAmount(payrollAccountingSummary.sanatorium15)}</strong>{' '}
                  {t('staffCurrency')}
                </p>
                <p className="text-slate-500">
                  Ҳангоми сабт кардани китоб, гузаронишҳои мемориалӣ-фармон дар ҷадвали амалиётҳои
                  мемориалӣ ба таври автоматикӣ сабт мешаванд.
                </p>
              </>
            )}
          </div>

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
      )}
    </section>
  );
}
