'use client';

import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import {
  calcEntryTotals,
  formatLedgerAmount,
  hasStoredPayrollLedger,
  mergePayrollLedgerForMonth,
  recalculatePayrollLedger,
  removePayrollLedger,
  resolveEmploymentWorkType,
  resolvePayrollLedgerMonth,
  upsertPayrollLedger,
} from '@/lib/finance-payroll-ledger';
import {
  fetchOrganizationSection,
  updateOrganizationSection,
} from '@/lib/organization-sections';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { formatAppDate } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import { parseAmount } from '@/lib/staff-table-calc';
import {
  activeEmployees,
  currentMonthKey,
  formatMonthLabel,
  shiftMonth,
} from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import {
  OrganizationSectionContent,
  PayrollLedger,
  PayrollLedgerEntry,
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

  useEffect(() => {
    if (!preferredMonth) return;
    setMonth(preferredMonth);
    onPreferredMonthApplied?.();
    document.getElementById('finance-payroll-ledger')?.scrollIntoView({ behavior: 'smooth' });
  }, [preferredMonth, onPreferredMonthApplied]);

  useEffect(() => {
    if (!staffContent) return;
    const merged = mergePayrollLedgerForMonth(financeContent.payrollLedgers, month, staffContent, {
      organizationId,
      positionHandovers: financeContent.positionHandovers,
      laborLeaves: financeContent.laborLeaves,
      payrollLedgers: financeContent.payrollLedgers,
    });
    setLedger(merged);
    setEditing(!hasStoredPayrollLedger(financeContent.payrollLedgers, month));
  }, [
    financeContent.payrollLedgers,
    financeContent.positionHandovers,
    financeContent.laborLeaves,
    staffContent,
    staffContent?.timesheets,
    month,
  ]);

  const monthLabel = formatMonthLabel(month, locale);
  const preparedAt = formatAppDate(ledger.preparedAt ?? Date.now(), locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const rows = useMemo(
    () =>
      ledger.entries
        .map((entry) => {
          const employee = employeeMap.get(entry.employeeId);
          if (!employee) return null;
          return { entry, employee, totals: calcEntryTotals(entry) };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    [ledger.entries, employeeMap]
  );

  const summary = useMemo(() => {
    const totals = rows.map((row) => row.totals);
    return {
      gross: totals.reduce((sum, item) => sum + item.gross, 0),
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

  function patchEntry(employeeId: string, field: keyof PayrollLedgerEntry, value: string) {
    setLedger((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.employeeId === employeeId ? { ...entry, [field]: value } : entry
      ),
    }));
  }

  async function persist(nextLedger: PayrollLedger) {
    setSaving(true);
    setError('');

    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      payrollLedgers: upsertPayrollLedger(financeContent.payrollLedgers, nextLedger),
    };

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
      ...recalculatePayrollLedger(ledger, staffContent, {
        organizationId,
        positionHandovers: financeContent.positionHandovers,
        laborLeaves: financeContent.laborLeaves,
        payrollLedgers: financeContent.payrollLedgers,
      }),
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
        laborLeaves: financeBase.laborLeaves,
        payrollLedgers: financeBase.payrollLedgers,
      }
    );
    setLedger(merged);

    if (hasStoredPayrollLedger(financeBase.payrollLedgers, month)) {
      setSaving(true);
      const payload: OrganizationSectionContent = {
        ...financeBase,
        summary: financeBase.summary?.trim() || t('financeDefaultSummary'),
        payrollLedgers: upsertPayrollLedger(financeBase.payrollLedgers, merged),
      };
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
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      payrollLedgers: removePayrollLedger(financeContent.payrollLedgers, month),
    };
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
          laborLeaves: saved.laborLeaves,
          payrollLedgers: saved.payrollLedgers,
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
            <div className="mt-3 space-y-1 text-[10px] text-slate-600">
              <p>{t('employmentWorkTypePrimaryTaxFormula')}</p>
              <p>{t('employmentWorkTypeSecondaryTaxFormula')}</p>
            </div>
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
                  <th colSpan={4} className="border border-slate-300 px-2 py-2">
                    {t('payrollLedgerColAccrued')}
                  </th>
                  <th colSpan={5} className="border border-slate-300 px-2 py-2">
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
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerColGross')}</th>
                  <th className="border border-slate-300 px-2 py-2">ФҲИА</th>
                  <th className="border border-slate-300 px-2 py-2">КИК</th>
                  <th className="border border-slate-300 px-2 py-2">ҲҲДТ</th>
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerColTax')}</th>
                  <th className="border border-slate-300 px-2 py-2">{t('payrollLedgerTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, employee, totals }, index) => (
                  <tr key={entry.employeeId}>
                    <td className="border border-slate-300 px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-slate-300 px-2 py-2 font-medium">
                      {employee.fullName}
                      {resolveEmploymentWorkType(employee) === 'secondary' && (
                        <span className="mt-0.5 block text-[9px] font-semibold uppercase text-amber-700">
                          {t('employmentWorkTypeSecondaryShort')}
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center">
                      {employee.personnelNumber || '—'}
                    </td>
                    <td className="border border-slate-300 px-2 py-2">{employee.position}</td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      <AmountInput
                        editing={editing}
                        value={entry.baseSalary}
                        onChange={(value) => patchEntry(entry.employeeId, 'baseSalary', value)}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      <AmountInput
                        editing={editing}
                        value={entry.allowances}
                        onChange={(value) => patchEntry(entry.employeeId, 'allowances', value)}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      <AmountInput
                        editing={editing}
                        value={entry.laborLeavePay ?? '0,00'}
                        onChange={(value) => patchEntry(entry.employeeId, 'laborLeavePay', value)}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-semibold">
                      {formatLedgerAmount(totals.gross)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      <AmountInput
                        editing={editing}
                        value={entry.fhea}
                        onChange={(value) => patchEntry(entry.employeeId, 'fhea', value)}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      <AmountInput
                        editing={editing}
                        value={entry.kik}
                        onChange={(value) => patchEntry(entry.employeeId, 'kik', value)}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      <AmountInput
                        editing={editing}
                        value={entry.hhdt}
                        onChange={(value) => patchEntry(entry.employeeId, 'hhdt', value)}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right">
                      <AmountInput
                        editing={editing}
                        value={entry.tax}
                        onChange={(value) => patchEntry(entry.employeeId, 'tax', value)}
                      />
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-semibold">
                      {formatLedgerAmount(totals.deductions)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-bold text-emerald-700">
                      {formatLedgerAmount(totals.netPay)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="border border-slate-300 px-2 py-2 text-center">
                    {t('payrollLedgerTotal')}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.baseSalary)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.allowances)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.laborLeavePay)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.gross)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.fhea)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.kik)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.hhdt)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.tax)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right">
                    {formatLedgerAmount(summary.deductions)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right text-emerald-700">
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
                {employees.length} нафар
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
          </div>

          <div className="mt-10 grid gap-8 text-xs text-slate-700 md:grid-cols-3">
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
            <div className="flex flex-col items-center">
              <p className="font-semibold">{t('payrollLedgerSeal')}</p>
              <div className="mt-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-300" />
            </div>
          </div>
        </div>
        </div>
      )}
    </section>
  );
}
