'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import {
  buildBalanceSheetReport,
  Form1ComputedRow,
} from '@/lib/financial-report-form1';
import {
  downloadBalanceSheetExcel,
  formatForm1Amount,
} from '@/lib/financial-report-form1-export';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { resolveBudgetAccountingSettings } from '@/lib/budget-accounting-journal';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { Organization } from '@/types/organization';
import {
  BalanceSheetReportSettings,
  OrganizationSectionContent,
} from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function readSettings(content: OrganizationSectionContent): BalanceSheetReportSettings {
  return content.balanceSheetReport ?? {};
}

function rowClassName(row: Form1ComputedRow): string {
  if (row.kind === 'header') return 'bg-[var(--bg-input)]/60 font-semibold';
  if (row.kind === 'total') return 'bg-emerald-500/10 font-bold';
  if (row.kind === 'subtotal') return 'bg-emerald-500/5 font-semibold';
  return '';
}

export default function FinanceReportForm1Panel({
  organizationId,
  organization,
  financeContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const { organizationName: reportOrganizationName } = useOrganizationReportHeader();
  const budgetSettings = resolveBudgetAccountingSettings(financeContent);
  const [settings, setSettings] = useState<BalanceSheetReportSettings>(() => readSettings(financeContent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(readSettings(financeContent));
  }, [financeContent.balanceSheetReport]);

  const fiscalYear = settings.fiscalYear ?? budgetSettings.fiscalYear;
  const journalCount = financeContent.budgetAccountingJournal?.length ?? 0;

  const document = useMemo(
    () =>
      buildBalanceSheetReport({
        financeContent,
        reportSettings: { ...settings, fiscalYear },
        organizationName: reportOrganizationName,
        rma: organization?.rma,
      }),
    [financeContent, settings, fiscalYear, reportOrganizationName, organization?.rma]
  );

  async function persist(nextSettings: BalanceSheetReportSettings) {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      balanceSheetReport: nextSettings,
    };
    try {
      const savedContent = await updateOrganizationSection(organizationId, 'finance', payload);
      if (!savedContent) {
        setError(t('sectionSaveError'));
        return;
      }
      onUpdate({
        ...savedContent,
        balanceSheetReport: savedContent.balanceSheetReport ?? nextSettings,
      });
      setSettings(readSettings(savedContent));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(t('sectionSaveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await persist(settings);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('financeReportForm1Intro')}</p>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4">
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('financeReportForm1Year')}</span>
          <input
            type="text"
            value={fiscalYear}
            onChange={(event) =>
              setSettings((current) => ({ ...current, fiscalYear: event.target.value }))
            }
            className="input-field w-28 text-xs"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('financeReportForm1PeriodEnd')}</span>
          <input
            type="date"
            value={settings.periodEnd ?? `${fiscalYear}-12-31`}
            onChange={(event) =>
              setSettings((current) => ({ ...current, periodEnd: event.target.value }))
            }
            className="input-field text-xs"
          />
        </label>
        <button type="button" onClick={handleSave} className="btn-primary text-xs" disabled={saving}>
          {saving ? '...' : t('save')}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600">{t('adsinSaved')}</span>}
      </div>

      {journalCount === 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900">
          {t('financeReportForm1NoJournal')}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">
          {t('financeReportForm1JournalHint', { count: journalCount, year: fiscalYear })}
        </p>
      )}

      {!document.totals.balancedClosing && journalCount > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900">
          {t('financeReportForm1Unbalanced', {
            assets: formatForm1Amount(document.totals.assetsClosing),
            liabilitiesEquity: formatForm1Amount(
              document.totals.liabilitiesClosing + document.totals.equityClosing
            ),
          })}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <DocumentExportMenu
          documentId="finance-form1-document"
          filename={`tavozun-${organizationId}-${fiscalYear}`}
          customExcelExport={async () => downloadBalanceSheetExcel(document, `tavozun-${organizationId}-${fiscalYear}`)}
        />
      </div>

      <article
        id="finance-form1-document"
        className="rounded-xl border border-[var(--border)] bg-white/5 p-5 md:p-6"
      >
        <OrganizationReportDocumentHeader />
        <div className="py-3 text-center">
          <p className="text-sm font-bold">{t('financeReportForm1')}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t('financeReportForm1PeriodLabel', {
              date: document.periodEndLabel,
              year: document.fiscalYear,
            })}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[40rem] text-xs">
            <thead>
              <tr>
                <th>{t('financeReportForm1ColName')}</th>
                <th className="w-16 text-center">{t('financeReportForm1ColCode')}</th>
                <th className="text-right">{t('financeReportForm1ColOpening')}</th>
                <th className="text-right">{t('financeReportForm1ColClosing')}</th>
              </tr>
            </thead>
            <tbody>
              {document.rows.map((row) => (
                <tr key={row.id} className={rowClassName(row)}>
                  <td style={{ paddingLeft: `${8 + row.indent * 12}px` }}>{row.name}</td>
                  <td className="text-center font-mono">{row.rowCode ?? ''}</td>
                  <td className="text-right tabular-nums">
                    {row.kind === 'header' ? '' : row.openingFormatted}
                  </td>
                  <td className="text-right tabular-nums">
                    {row.kind === 'header' ? '' : row.closingFormatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[10px] text-[var(--text-muted)]">{document.instructionRef}</p>
      </article>

      {document.trialBalance.length > 0 && (
        <details className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            {t('financeReportForm1TrialBalance')} ({document.trialBalance.length})
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>{t('nyahColAccount')}</th>
                  <th>{t('nyahColName')}</th>
                  <th className="text-right">{t('financeReportForm1ColOpeningDebit')}</th>
                  <th className="text-right">{t('financeReportForm1ColOpeningCredit')}</th>
                  <th className="text-right">{t('nyahColDebit')}</th>
                  <th className="text-right">{t('nyahColCredit')}</th>
                  <th className="text-right">{t('financeReportForm1ColClosingDebit')}</th>
                  <th className="text-right">{t('financeReportForm1ColClosingCredit')}</th>
                </tr>
              </thead>
              <tbody>
                {document.trialBalance.map((row) => (
                  <tr key={row.accountCode}>
                    <td className="font-mono">{row.accountCode}</td>
                    <td>{row.accountName}</td>
                    <td className="text-right tabular-nums">{formatForm1Amount(row.openingDebit)}</td>
                    <td className="text-right tabular-nums">{formatForm1Amount(row.openingCredit)}</td>
                    <td className="text-right tabular-nums">{formatForm1Amount(row.debitTurnover)}</td>
                    <td className="text-right tabular-nums">{formatForm1Amount(row.creditTurnover)}</td>
                    <td className="text-right tabular-nums">{formatForm1Amount(row.closingDebit)}</td>
                    <td className="text-right tabular-nums">{formatForm1Amount(row.closingCredit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
