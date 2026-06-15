'use client';

import {
  buildLocalPayrollRequirementDocument,
  formatRequirementAmount,
  hasLocalPayrollRequirementData,
  readBudgetArticle2121Amount,
  resolveLocalPayrollRequirementMonth,
} from '@/lib/finance-local-payroll-requirement';
import { downloadLocalPayrollRequirementExcel } from '@/lib/finance-local-payroll-requirement-export';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { printDocument } from '@/lib/print-document';
import { formatMonthLabel, shiftMonth } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, Fragment } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  preferredMonth?: string | null;
  onPreferredMonthApplied?: () => void;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function MetricCell({ value }: { value: number }) {
  return <span className="tabular-nums">{formatRequirementAmount(value)}</span>;
}

export default function FinanceLocalPayrollRequirementPanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  preferredMonth,
  onPreferredMonthApplied,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { organizationName: reportOrganizationName } = useOrganizationReportHeader();
  const [month, setMonth] = useState(() =>
    resolveLocalPayrollRequirementMonth(financeContent, preferredMonth)
  );
  const [article2121, setArticle2121] = useState(() =>
    String(readBudgetArticle2121Amount(financeContent, month) || 78)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!preferredMonth) return;
    setMonth(preferredMonth);
    onPreferredMonthApplied?.();
    document
      .getElementById('finance-local-payroll-requirement')
      ?.scrollIntoView({ behavior: 'smooth' });
  }, [preferredMonth, onPreferredMonthApplied]);

  useEffect(() => {
    setArticle2121(String(readBudgetArticle2121Amount(financeContent, month) || 78));
  }, [financeContent.localPayrollRequirementSettings, month]);

  const financeWithOverrides = useMemo(
    () => ({
      ...financeContent,
      localPayrollRequirementSettings: [
        ...(financeContent.localPayrollRequirementSettings ?? []).filter(
          (item) => item.month !== month
        ),
        {
          month,
          budgetArticle2121Amount: article2121,
        },
      ],
    }),
    [financeContent, month, article2121]
  );

  const documentData = useMemo(() => {
    if (!staffContent) return null;
    return buildLocalPayrollRequirementDocument(
      financeWithOverrides,
      staffContent,
      month,
      organization,
      reportOrganizationName
    );
  }, [financeWithOverrides, staffContent, month, organization, reportOrganizationName]);

  const monthLabel = formatMonthLabel(month, locale);
  const hasData = hasLocalPayrollRequirementData(documentData);
  const directorSignatureLabel = getDirectorSignatureLabel(organizationId);
  const accountantSignatureLabel = getAccountantSignatureLabel(staffContent, {
    chiefAccountantName: organization?.chiefAccountant,
    fallback: t('payrollLedgerAccountant'),
  });

  async function handleSaveSettings() {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      localPayrollRequirementSettings: financeWithOverrides.localPayrollRequirementSettings,
    };
    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);
    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }
    onUpdate(saved);
  }

  async function handleExcelExport() {
    if (!documentData) return;
    try {
      await downloadLocalPayrollRequirementExcel(documentData);
    } catch {
      setError(t('documentExportError'));
    }
  }

  return (
    <section
      id="finance-local-payroll-requirement"
      className="space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavLocalPayrollRequirement')}</p>
          <h4 className="text-base font-bold">{t('localPayrollRequirementTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t('localPayrollRequirementSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            className="btn-secondary px-2 py-1 text-xs"
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
          >
            →
          </button>
          <button
            type="button"
            onClick={() => printDocument('finance-local-payroll-requirement-document')}
            className="btn-primary text-xs"
            disabled={!documentData}
          >
            🖨 {t('localPayrollRequirementPrint')}
          </button>
          <button
            type="button"
            onClick={handleExcelExport}
            className="btn-secondary text-xs"
            disabled={!documentData}
          >
            {t('localPayrollRequirementExport')}
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 print:hidden md:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('localPayrollRequirementArticle2121')}</span>
          <input
            type="text"
            value={article2121}
            onChange={(event) => setArticle2121(event.target.value)}
            className="input-field w-full text-xs"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={saving}
            onClick={handleSaveSettings}
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300 print:hidden">
          {error}
        </p>
      ) : null}

      {!staffContent ? (
        <p className="text-xs text-[var(--text-muted)]">{t('financePayrollNoStaff')}</p>
      ) : !documentData || !hasData ? (
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-100 print:hidden">
          <p>{t('localPayrollRequirementNoData')}</p>
          <p className="text-[var(--text-muted)]">{t('localPayrollRequirementNoDataHint')}</p>
        </div>
      ) : (
        <div className="local-payroll-requirement-scroll w-full overflow-x-auto print:overflow-visible">
          <div
            id="finance-local-payroll-requirement-document"
            lang="tg"
            className="local-payroll-requirement-document mx-auto min-w-[72rem] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:min-w-0 print:border-0 print:p-2 print:shadow-none md:p-6"
          >
            <div className="mb-4 text-center text-xs leading-relaxed text-slate-700">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">
                {t('localPayrollRequirementInfoLabel')}
              </p>
              <h3 className="mt-2 text-sm font-bold text-slate-900">
                {t('localPayrollRequirementDocumentHeading', { month: monthLabel })}
              </h3>
              <p className="mt-2 text-sm font-semibold">{documentData.organizationName}</p>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[68rem] border-collapse text-[9px] md:text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-1 py-2">№</th>
                    <th className="min-w-[12rem] border border-slate-300 px-1 py-2 text-left">
                      {t('localPayrollRequirementColGroup')}
                    </th>
                    <th className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColApprovedUnits')}
                    </th>
                    <th className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColApprovedFund')}
                    </th>
                    <th className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColDecree469')}
                    </th>
                    <th colSpan={2} className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColVacant')}
                    </th>
                    <th colSpan={2} className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColActual')}
                    </th>
                    <th colSpan={6} className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColDeductions')}
                    </th>
                    <th className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColNet')}
                    </th>
                    <th className="border border-slate-300 px-1 py-2">
                      {t('localPayrollRequirementColFhea25')}
                    </th>
                  </tr>
                  <tr className="bg-slate-50">
                    <th colSpan={5} className="border border-slate-300 px-1 py-1" />
                    <th className="border border-slate-300 px-1 py-1">
                      {t('localPayrollRequirementColQty')}
                    </th>
                    <th className="border border-slate-300 px-1 py-1">
                      {t('localPayrollRequirementColAmount')}
                    </th>
                    <th className="border border-slate-300 px-1 py-1">
                      {t('localPayrollRequirementColQty')}
                    </th>
                    <th className="border border-slate-300 px-1 py-1">
                      {t('localPayrollRequirementColAmount')}
                    </th>
                    <th className="border border-slate-300 px-1 py-1">{t('payrollLedgerColTax')}</th>
                    <th className="border border-slate-300 px-1 py-1">ФҲИА</th>
                    <th className="border border-slate-300 px-1 py-1">КИК</th>
                    <th className="border border-slate-300 px-1 py-1">ҲҲДТ</th>
                    <th className="border border-slate-300 px-1 py-1">
                      {t('localPayrollRequirementColOther')}
                    </th>
                    <th className="border border-slate-300 px-1 py-1">
                      {t('payrollLedgerTotal')}
                    </th>
                    <th colSpan={2} className="border border-slate-300 px-1 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {documentData.groups.map((group) => (
                    <Fragment key={group.id}>
                      <tr key={`${group.id}-header`} className="bg-sky-50 font-bold">
                        <td colSpan={17} className="border border-slate-300 px-2 py-2 text-center">
                          {group.title}
                        </td>
                      </tr>
                      <tr key={`${group.id}-employees`}>
                        <td className="border border-slate-300 px-1 py-1 text-center">1</td>
                        <td className="border border-slate-300 px-1 py-1">Ҳамагӣ кормандон</td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.approvedUnits} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.approvedFund} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.decree469} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.vacantUnits} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.vacantAmount} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.actualUnits} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.actualAmount} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.incomeTax} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.fhea1} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.unionFee} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.hhdt} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.otherDeductions} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.totalDeductions} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.netPay} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.employees.fhea25} />
                        </td>
                      </tr>
                      <tr key={`${group.id}-bank`}>
                        <td className="border border-slate-300 px-1 py-1 text-center">2</td>
                        <td className="border border-slate-300 px-1 py-1">Хизмати бонк-0,5%</td>
                        <td colSpan={7} className="border border-slate-300 px-1 py-1" />
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.bankFee.actualAmount} />
                        </td>
                        <td colSpan={6} className="border border-slate-300 px-1 py-1" />
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.bankFee.fhea25} />
                        </td>
                      </tr>
                      <tr key={`${group.id}-subtotal`} className="bg-slate-100 font-semibold">
                        <td colSpan={2} className="border border-slate-300 px-1 py-1 text-center">
                          ЧАМЪ:
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.approvedUnits} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.approvedFund} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.decree469} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.vacantUnits} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.vacantAmount} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.actualUnits} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.actualAmount} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.incomeTax} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.fhea1} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.unionFee} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.hhdt} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.otherDeductions} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.totalDeductions} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.netPay} />
                        </td>
                        <td className="border border-slate-300 px-1 py-1 text-right">
                          <MetricCell value={group.subtotal.fhea25} />
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                  <tr className="bg-amber-50 font-bold">
                    <td colSpan={2} className="border border-slate-300 px-1 py-2 text-center">
                      Х А М А Г И
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.approvedUnits} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.approvedFund} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.decree469} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.vacantUnits} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.vacantAmount} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.actualUnits} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.actualAmount} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.incomeTax} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.fhea1} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.unionFee} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.hhdt} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.otherDeductions} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.totalDeductions} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.netPay} />
                    </td>
                    <td className="border border-slate-300 px-1 py-2 text-right">
                      <MetricCell value={documentData.grandTotal.fhea25} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 overflow-x-auto print:overflow-visible">
              <p className="mb-2 text-center text-[10px] font-semibold">
                {t('localPayrollRequirementPaymentSection')}
              </p>
              <table className="w-full min-w-[48rem] border-collapse text-[9px] md:text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-1 py-2">{t('localPayrollRequirementColArticle')}</th>
                    <th className="border border-slate-300 px-1 py-2">{t('localPayrollRequirementColSalaryPay')}</th>
                    <th className="border border-slate-300 px-1 py-2">{t('payrollLedgerColTax')}</th>
                    <th className="border border-slate-300 px-1 py-2">ФҲИА</th>
                    <th className="border border-slate-300 px-1 py-2">КИК</th>
                    <th className="border border-slate-300 px-1 py-2">ҲҲДТ</th>
                    <th className="border border-slate-300 px-1 py-2">{t('localPayrollRequirementColOther')}</th>
                    <th className="border border-slate-300 px-1 py-2">{t('payrollLedgerTotal')}</th>
                    <th className="border border-slate-300 px-1 py-2">{t('localPayrollRequirementColBankFee')}</th>
                    <th className="border border-slate-300 px-1 py-2">{t('localPayrollRequirementColSanatorium')}</th>
                    <th className="border border-slate-300 px-1 py-2">{t('localPayrollRequirementColFhea25Pay')}</th>
                    <th className="border border-slate-300 px-1 py-2">{t('localPayrollRequirementColExpenseTotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...documentData.paymentRows, documentData.paymentTotal].map((row) => (
                    <tr
                      key={row.article}
                      className={row.article === 'Ҳамагӣ' ? 'bg-slate-100 font-bold' : undefined}
                    >
                      <td className="border border-slate-300 px-1 py-1 text-center">{row.article}</td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.salaryPay} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.incomeTax} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.fhea1} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.unionFee} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.hhdt} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.otherDeductions} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.totalDeductions} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.bankFee} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.sanatorium15} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.fhea25Payment} />
                      </td>
                      <td className="border border-slate-300 px-1 py-1 text-right">
                        <MetricCell value={row.totalExpense} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid gap-6 text-xs md:grid-cols-2">
              <div>
                <p>
                  {directorSignatureLabel}: <strong>{documentData.directorName || '—'}</strong>
                </p>
                <p className="mt-6 text-[var(--text-muted)]">(имзо)</p>
              </div>
              <div>
                <p>
                  {accountantSignatureLabel}: <strong>{documentData.accountantName || '—'}</strong>
                </p>
                <p className="mt-6 text-[var(--text-muted)]">(имзо)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
