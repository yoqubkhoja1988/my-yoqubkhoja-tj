'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import {
  resolveBudgetAccountingSettings,
  supportsBudgetAccounting,
} from '@/lib/budget-accounting-settings';
import { downloadTurnoverStatementExcel } from '@/lib/budget-turnover-statement-export';
import {
  buildTurnoverStatement,
  formatTurnoverPeriodLabel,
  formatTurnoverStatementAmount,
  resolveTurnoverPeriod,
} from '@/lib/budget-turnover-statement';
import { NYAH_INSTRUCTION } from '@/lib/budget-unified-chart-of-accounts';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { printDocument } from '@/lib/print-document';
import { Organization } from '@/types/organization';
import {
  BudgetAccountingSettings,
  OrganizationSectionContent,
} from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function AmountCell({ value }: { value: number }) {
  return <span className="tabular-nums">{formatTurnoverStatementAmount(value)}</span>;
}

export default function FinanceTurnoverStatementPanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const [settings, setSettings] = useState<BudgetAccountingSettings>(() =>
    resolveBudgetAccountingSettings(financeContent)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSettings(resolveBudgetAccountingSettings(financeContent));
  }, [financeContent.budgetAccountingSettings]);

  const period = useMemo(() => resolveTurnoverPeriod(settings), [settings]);
  const documentData = useMemo(
    () => buildTurnoverStatement(financeContent, settings, period),
    [financeContent, settings, period]
  );

  const journalCount = financeContent.budgetAccountingJournal?.length ?? 0;
  const openingCount = Object.keys(settings.openingBalances ?? {}).length;
  const directorSignatureLabel = getDirectorSignatureLabel(organizationId);
  const accountantSignatureLabel = getAccountantSignatureLabel(staffContent, {
    chiefAccountantName: organization?.chiefAccountant,
    fallback: t('payrollLedgerAccountant'),
  });

  async function persistSettings(next: BudgetAccountingSettings) {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      budgetAccountingSettings: next,
    };
    const saved = await updateOrganizationSection(organizationId, 'finance', payload);
    setSaving(false);
    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }
    setSettings(resolveBudgetAccountingSettings(saved));
    onUpdate(saved);
  }

  function updatePeriod(field: 'turnoverPeriodFrom' | 'turnoverPeriodTo', value: string) {
    const next = { ...settings, [field]: value };
    setSettings(next);
    void persistSettings(next);
  }

  if (!supportsBudgetAccounting(organizationId)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="page-eyebrow">{t('financeNavTurnoverStatement')}</p>
        <h4 className="text-sm font-bold">{t('turnoverStatementTitle')}</h4>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          {t('turnoverStatementIntro', {
            instruction: NYAH_INSTRUCTION.number,
            date: NYAH_INSTRUCTION.date,
          })}
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <label className="space-y-1">
          <span className="field-label">{t('turnoverStatementPeriodFrom')}</span>
          <input
            type="date"
            className="input-field text-xs"
            value={period.from}
            disabled={saving}
            onChange={(event) => updatePeriod('turnoverPeriodFrom', event.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="field-label">{t('turnoverStatementPeriodTo')}</span>
          <input
            type="date"
            className="input-field text-xs"
            value={period.to}
            disabled={saving}
            onChange={(event) => updatePeriod('turnoverPeriodTo', event.target.value)}
          />
        </label>
        <div className="text-xs text-[var(--text-muted)] sm:col-span-2">
          <p>{t('turnoverStatementSources', { openingCount, journalCount })}</p>
          {openingCount === 0 ? (
            <p className="mt-1 text-amber-300">{t('turnoverStatementNoOpeningHint')}</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300 print:hidden">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={() => printDocument('finance-turnover-statement-document')}
          className="btn-primary text-xs"
        >
          🖨 {t('bankPaymentPrint')}
        </button>
        <DocumentExportMenu
          documentId="finance-turnover-statement-document"
          filename={`vedomosti-gardish-saldo-${settings.fiscalYear}`}
          customExcelExport={() =>
            downloadTurnoverStatementExcel(
              documentData,
              organization?.name ?? '',
              settings.fiscalYear
            )
          }
        />
      </div>

      <div
        id="finance-turnover-statement-document"
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:border-0 print:p-2 print:shadow-none"
      >
        <div className="mb-4 text-center">
          <p className="text-sm font-bold tracking-wide">ВЕДОМОСТИ ГАРДИШИ - САЛДО</p>
          <OrganizationReportDocumentHeader className="mt-2 text-sm font-semibold" />
        </div>

        <table className="w-full min-w-[56rem] border-collapse text-[10px]">
          <thead>
            <tr>
              <th colSpan={2} className="border border-slate-300 px-2 py-2 text-left">
                {t('turnoverStatementAccountSection')}
              </th>
              <th colSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('turnoverStatementOpeningBalance')}
                <div className="mt-1 font-normal">
                  {formatTurnoverPeriodLabel(documentData.periodFrom)}
                </div>
              </th>
              <th colSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('turnoverStatementPeriodTurnover')}
              </th>
              <th colSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('turnoverStatementClosingBalance')}
                <div className="mt-1 font-normal">
                  {formatTurnoverPeriodLabel(documentData.periodTo)}
                </div>
              </th>
            </tr>
            <tr className="bg-slate-50">
              <th className="border border-slate-300 px-2 py-1 text-left">
                {t('turnoverStatementColName')}
              </th>
              <th className="border border-slate-300 px-2 py-1 text-left">
                {t('financeReportForm1ColCode')}
              </th>
              <th className="border border-slate-300 px-2 py-1 text-right">
                {t('nyahColDebit')}
              </th>
              <th className="border border-slate-300 px-2 py-1 text-right">
                {t('nyahColCredit')}
              </th>
              <th className="border border-slate-300 px-2 py-1 text-right">
                {t('nyahColDebit')}
              </th>
              <th className="border border-slate-300 px-2 py-1 text-right">
                {t('nyahColCredit')}
              </th>
              <th className="border border-slate-300 px-2 py-1 text-right">
                {t('nyahColDebit')}
              </th>
              <th className="border border-slate-300 px-2 py-1 text-right">
                {t('nyahColCredit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {documentData.rows.map((row, index) =>
              row.kind === 'header' ? (
                <tr key={`header-${row.label}-${index}`} className="bg-sky-50 font-bold">
                  <td colSpan={8} className="border border-slate-300 px-2 py-2">
                    {row.label}
                  </td>
                </tr>
              ) : (
                <tr key={row.accountCode ?? `row-${index}`}>
                  <td className="border border-slate-300 px-2 py-1">{row.label}</td>
                  <td className="border border-slate-300 px-2 py-1 font-mono">{row.accountCode}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <AmountCell value={row.openingDebit} />
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <AmountCell value={row.openingCredit} />
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <AmountCell value={row.debitTurnover} />
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <AmountCell value={row.creditTurnover} />
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <AmountCell value={row.closingDebit} />
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right">
                    <AmountCell value={row.closingCredit} />
                  </td>
                </tr>
              )
            )}
            <tr className="bg-amber-50 font-bold">
              <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center">
                {t('payrollLedgerTotal')}
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right">
                <AmountCell value={documentData.totals.openingDebit} />
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right">
                <AmountCell value={documentData.totals.openingCredit} />
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right">
                <AmountCell value={documentData.totals.debitTurnover} />
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right">
                <AmountCell value={documentData.totals.creditTurnover} />
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right">
                <AmountCell value={documentData.totals.closingDebit} />
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right">
                <AmountCell value={documentData.totals.closingCredit} />
              </td>
            </tr>
          </tbody>
        </table>

        <OrganizationDocumentSignatureFooter
          className="mt-8"
          director={{
            label: directorSignatureLabel,
            name: organization?.director,
          }}
          accountant={{
            label: accountantSignatureLabel,
            name: organization?.chiefAccountant,
          }}
          sealLabel={t('payrollLedgerSeal')}
        />
      </div>
    </div>
  );
}
