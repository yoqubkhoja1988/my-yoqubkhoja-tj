'use client';

import {
  buildBankPaymentDocument,
  downloadBankPaymentExcel,
  formatBankPaymentAmount,
  getBankPaymentExportLabels,
  resolveBankPaymentMonth,
} from '@/lib/finance-bank-payment-export';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { printDocument } from '@/lib/print-document';
import { shiftMonth } from '@/lib/staff-timesheet';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  preferredMonth?: string | null;
  onPreferredMonthApplied?: () => void;
};

export default function FinanceBankPaymentPanel({
  organization,
  financeContent,
  staffContent,
  preferredMonth,
  onPreferredMonthApplied,
}: Props) {
  const t = useTranslations();
  const { organizationName: reportOrganizationName } = useOrganizationReportHeader();
  const [month, setMonth] = useState(() => resolveBankPaymentMonth(financeContent, preferredMonth));
  useEffect(() => {
    if (!preferredMonth) return;
    setMonth(preferredMonth);
    onPreferredMonthApplied?.();
    document.getElementById('finance-bank-payment')?.scrollIntoView({ behavior: 'smooth' });
  }, [preferredMonth, onPreferredMonthApplied]);

  const directorSignatureLabel = getDirectorSignatureLabel(organization?.id);

  const documentData = useMemo(() => {
    if (!staffContent) return null;
    return buildBankPaymentDocument(
      financeContent,
      staffContent,
      month,
      organization,
      reportOrganizationName
    );
  }, [financeContent, staffContent, month, organization, reportOrganizationName]);

  async function handleExcelExport() {
    if (!documentData) return;
    await downloadBankPaymentExcel(
      documentData,
      getBankPaymentExportLabels({
        directorName: organization?.director ?? '',
        accountantName: organization?.chiefAccountant ?? '',
        organizationId: organization?.id,
      })
    );
  }

  return (
    <section id="finance-bank-payment" className="space-y-4 border-t border-[var(--border)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavBankPayment')}</p>
          <h4 className="text-base font-bold">{t('bankPaymentTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('bankPaymentSubtitle')}</p>
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
            onClick={() => printDocument('finance-bank-payment-document')}
            className="btn-primary text-xs"
            disabled={!documentData?.rows.length}
          >
            🖨 {t('bankPaymentPrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-bank-payment-document"
            filename={`pardokh-bank-${month}`}
            disabled={!documentData?.rows.length}
            customExcelExport={handleExcelExport}
          />
        </div>
      </div>

      {!staffContent ? (
        <p className="text-xs text-[var(--text-muted)]">{t('financePayrollNoStaff')}</p>
      ) : !documentData?.rows.length ? (
        <p className="text-xs text-[var(--text-muted)]">{t('bankPaymentNoData')}</p>
      ) : (
        <>
          {documentData.missingAccounts > 0 && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 print:hidden">
              {t('bankPaymentMissingAccounts', { count: documentData.missingAccounts })}
            </p>
          )}

          <p className="text-xs text-[var(--text-muted)] print:hidden">{t('bankPaymentImportHint')}</p>

          <div className="bank-payment-scroll w-full overflow-x-auto print:overflow-visible">
            <div
              id="finance-bank-payment-document"
              lang="tg"
              translate="no"
              className="bank-payment-document notranslate mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:border-0 print:p-2 print:shadow-none md:p-6"
            >
              <header className="mb-4 rounded-lg bg-amber-100 px-4 py-3 text-center text-xs leading-relaxed text-slate-800">
                <h3 className="text-sm font-bold text-slate-900">
                  {t('bankPaymentDocumentHeading', {
                    organization: reportOrganizationName || t('payrollLedgerOrganization'),
                  })}
                </h3>
                <p className="mt-2">{documentData.periodLabel}</p>
                <p className="mt-1">
                  {t('bankPaymentPreparedAt')}: <strong>{documentData.preparedAt}</strong>
                </p>
              </header>

              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-sky-100">
                      <th className="border border-slate-300 px-2 py-2">{t('bankPaymentColNo')}</th>
                      <th className="border border-slate-300 px-2 py-2">
                        {t('bankPaymentColAccount')}
                      </th>
                      <th className="border border-slate-300 px-2 py-2">
                        {t('bankPaymentColAmount')}
                      </th>
                      <th className="min-w-[12rem] border border-slate-300 px-2 py-2">
                        {t('bankPaymentColName')}
                      </th>
                      <th className="min-w-[14rem] border border-slate-300 px-2 py-2">
                        {t('bankPaymentColPurpose')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentData.rows.map((row) => (
                      <tr key={row.rowKey}>
                        <td className="border border-slate-300 px-2 py-2 text-center">{row.index}</td>
                        <td className="border border-slate-300 px-2 py-2 font-mono text-[11px]">
                          {row.bankAccount || ''}
                        </td>
                        <td className="border border-slate-300 px-2 py-2 text-right">
                          {formatBankPaymentAmount(row.netPay)}
                        </td>
                        <td className="border border-slate-300 px-2 py-2">
                          {row.employee.fullName}
                        </td>
                        <td className="border border-slate-300 px-2 py-2 text-[11px]">
                          {row.purpose}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td colSpan={2} className="border border-slate-300 px-2 py-2 text-right">
                        {t('bankPaymentTotal')}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-right">
                        {formatBankPaymentAmount(documentData.totalNetPay)}
                      </td>
                      <td colSpan={2} className="border border-slate-300 px-2 py-2" />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-700">
                <p>
                  {t('bankPaymentTotalInWords')}:{' '}
                  <strong>{documentData.totalInWords}</strong>
                </p>
              </div>

              <div className="mt-10 grid gap-8 text-xs text-slate-700 md:grid-cols-2">
                <div>
                  <p className="font-semibold">{directorSignatureLabel}</p>
                  <p className="mt-6 border-t border-slate-400 pt-1">
                    {organization?.director || '________________'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{t('payrollLedgerAccountant')}</p>
                  <p className="print-supplement text-[10px] text-slate-500">{t('bankPaymentAccountantRole')}</p>
                  <p className="mt-4 border-t border-slate-400 pt-1">
                    {organization?.chiefAccountant || '________________'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
