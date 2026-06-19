'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import {
  downloadSocialInsuranceAgencyExcel,
  formatAdsinAmount,
} from '@/lib/social-insurance-agency-export';
import { updateOrganizationSection } from '@/lib/organization-sections';
import {
  AdsinQuarter,
  ADSIN_MONTH_LABELS_TJ,
  buildSocialInsuranceAgencyReport,
  resolveAdsinQuarter,
  resolveAdsinYear,
} from '@/lib/social-insurance-agency-reporting';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { printDocument } from '@/lib/print-document';
import { Organization } from '@/types/organization';
import {
  OrganizationSectionContent,
  SocialInsuranceAgencyReportSettings,
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

const MANUAL_FIELDS: Array<{
  key: keyof SocialInsuranceAgencyReportSettings;
  labelKey: string;
  group: 'opening' | 'adjustment' | 'paid';
}> = [
  { key: 'openingDebtAgent25', labelKey: 'adsinOpeningDebtAgent25', group: 'opening' },
  { key: 'openingDebtAgent1', labelKey: 'adsinOpeningDebtAgent1', group: 'opening' },
  { key: 'openingDebtTaxpayer25', labelKey: 'adsinOpeningDebtTaxpayer25', group: 'opening' },
  { key: 'openingDebtTaxpayer1', labelKey: 'adsinOpeningDebtTaxpayer1', group: 'opening' },
  { key: 'recalculatedPlus25', labelKey: 'adsinRecalculatedPlus25', group: 'adjustment' },
  { key: 'recalculatedPlus1', labelKey: 'adsinRecalculatedPlus1', group: 'adjustment' },
  { key: 'recalculatedMinus25', labelKey: 'adsinRecalculatedMinus25', group: 'adjustment' },
  { key: 'recalculatedMinus1', labelKey: 'adsinRecalculatedMinus1', group: 'adjustment' },
  { key: 'penalty25', labelKey: 'adsinPenalty25', group: 'adjustment' },
  { key: 'penalty1', labelKey: 'adsinPenalty1', group: 'adjustment' },
  { key: 'paidYtd25', labelKey: 'adsinPaidYtd25', group: 'paid' },
  { key: 'paidYtd1', labelKey: 'adsinPaidYtd1', group: 'paid' },
];

function readSettings(
  financeContent: OrganizationSectionContent
): SocialInsuranceAgencyReportSettings {
  return financeContent.socialInsuranceAgencySettings ?? {};
}

export default function FinanceSocialInsuranceAgencyPanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const { organizationName: reportOrganizationName } = useOrganizationReportHeader();
  const [year, setYear] = useState(() => resolveAdsinYear(financeContent));
  const [quarter, setQuarter] = useState<AdsinQuarter>(() => resolveAdsinQuarter());
  const [settings, setSettings] = useState<SocialInsuranceAgencyReportSettings>(() =>
    readSettings(financeContent)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(readSettings(financeContent));
  }, [financeContent.socialInsuranceAgencySettings]);

  const financeWithSettings = useMemo(
    () => ({
      ...financeContent,
      socialInsuranceAgencySettings: {
        ...settings,
        fiscalYear: String(year),
      },
    }),
    [financeContent, settings, year]
  );

  const report = useMemo(() => {
    if (!staffContent) return null;
    return buildSocialInsuranceAgencyReport(
      financeWithSettings,
      staffContent,
      organization,
      {
        year,
        quarter,
        organizationName: reportOrganizationName,
      }
    );
  }, [
    financeWithSettings,
    staffContent,
    organization,
    year,
    quarter,
    reportOrganizationName,
  ]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const next: OrganizationSectionContent = {
        ...financeContent,
        socialInsuranceAgencySettings: {
          ...settings,
          fiscalYear: String(year),
        },
      };
      const savedContent = await updateOrganizationSection(organizationId, 'finance', next);
      if (savedContent) onUpdate(savedContent);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('adsinSaveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleExcelExport() {
    if (!report) return;
    await downloadSocialInsuranceAgencyExcel(report);
  }

  function updateSetting(key: keyof SocialInsuranceAgencyReportSettings, value: string) {
    const parsed = value.trim() === '' ? undefined : Number.parseFloat(value.replace(/,/g, ''));
    setSettings((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : undefined,
    }));
    setSaved(false);
  }

  return (
    <section
      id="finance-social-insurance-agency"
      className="space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavSocialInsuranceAgency')}</p>
          <h4 className="text-base font-bold">{t('adsinTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('adsinSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number.parseInt(event.target.value, 10) || year)}
            className="input-field w-24 text-xs"
            aria-label={t('adsinYear')}
          />
          <select
            value={quarter}
            onChange={(event) => setQuarter(Number(event.target.value) as AdsinQuarter)}
            className="input-field w-auto text-xs"
            aria-label={t('adsinQuarter')}
          >
            <option value={1}>{t('adsinQuarter1')}</option>
            <option value={2}>{t('adsinQuarter2')}</option>
            <option value={3}>{t('adsinQuarter3')}</option>
            <option value={4}>{t('adsinQuarter4')}</option>
          </select>
          <button
            type="button"
            onClick={() => printDocument('finance-social-insurance-agency-document')}
            className="btn-primary text-xs"
            disabled={!report}
          >
            🖨 {t('adsinPrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-social-insurance-agency-document"
            filename={`adsin-${year}-Q${quarter}`}
            customExcelExport={handleExcelExport}
            disabled={!report}
          />
          <button
            type="button"
            onClick={handleSave}
            className="btn-secondary text-xs"
            disabled={saving}
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {saved ? <p className="text-xs text-emerald-400">{t('adsinSaved')}</p> : null}

      {!staffContent ? (
        <p className="text-sm text-[var(--text-muted)]">{t('adsinNoStaff')}</p>
      ) : null}

      {report ? (
        <div id="finance-social-insurance-agency-document" className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] p-4 text-sm">
            <p className="font-semibold">{report.organizationName}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {t('adsinRms')}: {report.rmsCode || '—'}
              {report.ryam ? ` · ${t('adsinRyam')}: ${report.ryam}` : ''}
            </p>
            <p className="mt-2 text-xs">
              {t('adsinPeriodLabel', { quarter: report.quarter, year: report.year })}
            </p>
          </div>

          <div>
            <h5 className="mb-2 text-sm font-semibold">{t('adsinPart1Title')}</h5>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t('adsinMonth')}</th>
                    <th>{t('adsinEmployeeCount')}</th>
                    <th>{t('adsinPayrollFund')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlyStats
                    .filter(
                      (stat) =>
                        report.quarterMonths.includes(stat.month) && stat.hasStoredLedger
                    )
                    .map((stat) => (
                      <tr key={stat.month}>
                        <td>{ADSIN_MONTH_LABELS_TJ[stat.monthIndex]}</td>
                        <td className="tabular-nums">{stat.employeeCount}</td>
                        <td className="tabular-nums">{formatAdsinAmount(stat.payrollFund)}</td>
                      </tr>
                    ))}
                  <tr className="font-semibold">
                    <td>{t('adsinQuarterTotal')}</td>
                    <td className="tabular-nums">{report.quarterEmployeeCount}</td>
                    <td className="tabular-nums">{formatAdsinAmount(report.quarterPayrollFund)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2}>{t('adsinYtdPayrollFund')}</td>
                    <td className="tabular-nums">{formatAdsinAmount(report.yearToDatePayrollFund)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h5 className="mb-2 text-sm font-semibold">{t('adsinContributionsTitle')}</h5>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th />
                    <th>{t('adsinRate25')}</th>
                    <th>{t('adsinRate1')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{t('adsinCalculatedQuarter')}</td>
                    <td className="tabular-nums">
                      {formatAdsinAmount(report.calculatedQuarter.employer25)}
                    </td>
                    <td className="tabular-nums">
                      {formatAdsinAmount(report.calculatedQuarter.employee1)}
                    </td>
                  </tr>
                  <tr>
                    <td>{t('adsinCalculatedYtd')}</td>
                    <td className="tabular-nums">
                      {formatAdsinAmount(report.calculatedYtd.employer25)}
                    </td>
                    <td className="tabular-nums">
                      {formatAdsinAmount(report.calculatedYtd.employee1)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="print:hidden">
            <h5 className="mb-2 text-sm font-semibold">{t('adsinManualTitle')}</h5>
            <div className="grid gap-3 sm:grid-cols-2">
              {MANUAL_FIELDS.map((field) => (
                <label key={field.key} className="block text-xs">
                  <span className="mb-1 block text-[var(--text-muted)]">{t(field.labelKey)}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      settings[field.key] !== undefined && settings[field.key] !== null
                        ? String(settings[field.key])
                        : ''
                    }
                    onChange={(event) => updateSetting(field.key, event.target.value)}
                    className="input-field w-full"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h5 className="mb-2 text-sm font-semibold">{t('adsinEmployeesTitle')}</h5>
            {report.employeeRows.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">{t('adsinNoPayrollData')}</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>{t('adsinRis')}</th>
                      <th>{t('adsinFullName')}</th>
                      {report.quarterMonths.map((month) => (
                        <th key={month}>{month.slice(5, 7)}</th>
                      ))}
                      <th>{t('adsinRate1')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employeeRows.map((row) => (
                      <tr key={row.personKey}>
                        <td>{row.index}</td>
                        <td>{row.ris || '—'}</td>
                        <td>{row.fullName}</td>
                        {report.quarterMonths.map((month) => (
                          <td key={month} className="tabular-nums">
                            {formatAdsinAmount(row.monthlyGross[month] ?? 0)}
                          </td>
                        ))}
                        <td className="tabular-nums">
                          {formatAdsinAmount(row.socialInsurance1Percent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {report.benefitRows.length > 0 ? (
            <div>
              <h5 className="mb-2 text-sm font-semibold">{t('adsinBenefitsTitle')}</h5>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>{t('adsinBenefitCategory')}</th>
                      <th>{t('adsinFullName')}</th>
                      <th>{t('adsinTotal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.benefitRows.map((row) => (
                      <tr key={`${row.category}-${row.personKey}`}>
                        <td>{row.categoryLabel}</td>
                        <td>{row.fullName}</td>
                        <td className="tabular-nums">{formatAdsinAmount(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
