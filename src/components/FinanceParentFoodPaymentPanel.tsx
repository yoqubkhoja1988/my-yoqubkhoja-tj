'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import {
  DEFAULT_KINDERGARTEN_GROUPS,
  createPlaceholderEnrollees,
  educatorOptions,
  activePreschoolEnrollees,
} from '@/lib/finance-parent-membership-fee';
import {
  DEFAULT_MEAL_DAYS_PER_MONTH,
  PARENT_FOOD_PAYMENT_ACCOUNT_INDICATORS,
  PARENT_FOOD_PAYMENT_LEGAL_BASIS,
  PARENT_FOOD_PAYMENT_RULES,
  buildFoodPaymentJournalEntries,
  expectedFoodAmount,
  findFoodPayment,
  foodPaymentStatusLabel,
  formatFoodAmount,
  parentFoodPaymentFileName,
  resolveParentFoodPaymentSettings,
  summarizeParentFoodPayments,
  upsertParentFoodPayment,
} from '@/lib/finance-parent-food-payment';
import { resolveOrganizationDocumentSignatures } from '@/lib/organization-document-signatures';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { formatAppDate } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { Organization } from '@/types/organization';
import {
  OrganizationSectionContent,
  ParentFoodPayment,
  ParentFoodPaymentSettings,
  PreschoolEnrollee,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  onUpdate: (content: OrganizationSectionContent) => void;
};

export default function FinanceParentFoodPaymentPanel({
  organizationId,
  organization,
  financeContent,
  staffContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { canEdit } = useOrganizationAccess();
  const { organizationName: reportOrganizationName } = useOrganizationReportHeader();
  const [settings, setSettings] = useState(() =>
    resolveParentFoodPaymentSettings(financeContent)
  );
  const [enrollees, setEnrollees] = useState<PreschoolEnrollee[]>(
    () => financeContent.preschoolEnrollees ?? []
  );
  const [payments, setPayments] = useState<ParentFoodPayment[]>(
    () => financeContent.parentFoodPayments ?? []
  );
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const signatures = resolveOrganizationDocumentSignatures(t, {
    organizationId,
    organization,
    staffContent,
  });

  const educators = useMemo(() => educatorOptions(staffContent), [staffContent]);
  const period = month;
  const summary = useMemo(
    () => summarizeParentFoodPayments(settings, enrollees, payments, period),
    [settings, enrollees, payments, period]
  );
  const activeEnrollees = useMemo(() => activePreschoolEnrollees(enrollees), [enrollees]);
  const journalEntries = useMemo(
    () => buildFoodPaymentJournalEntries(settings, summary.paidTotal),
    [settings, summary.paidTotal]
  );
  const canExport = activeEnrollees.length > 0;

  async function persist(
    nextSettings: ParentFoodPaymentSettings,
    nextEnrollees: PreschoolEnrollee[],
    nextPayments: ParentFoodPayment[]
  ) {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      parentFoodPaymentSettings: nextSettings,
      preschoolEnrollees: nextEnrollees,
      parentFoodPayments: nextPayments,
    };
    try {
      const saved = await updateOrganizationSection(organizationId, 'finance', payload);
      if (!saved) {
        setError(t('sectionSaveError'));
        return;
      }
      onUpdate({
        ...saved,
        parentFoodPaymentSettings:
          saved.parentFoodPaymentSettings ?? payload.parentFoodPaymentSettings,
        preschoolEnrollees: saved.preschoolEnrollees ?? payload.preschoolEnrollees,
        parentFoodPayments: saved.parentFoodPayments ?? payload.parentFoodPayments,
      });
      setSettings(resolveParentFoodPaymentSettings(saved));
      setEnrollees(saved.preschoolEnrollees ?? nextEnrollees);
      setPayments(saved.parentFoodPayments ?? nextPayments);
    } catch {
      setError(t('sectionSaveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll() {
    await persist(settings, enrollees, payments);
  }

  function patchEnrollee(id: string, patch: Partial<PreschoolEnrollee>) {
    setEnrollees((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function addEnrollee() {
    setEnrollees((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        groupName: '',
        childFullName: '',
        parentFullName: '',
        active: true,
      },
    ]);
  }

  function seedGroups() {
    const seeded: PreschoolEnrollee[] = [];
    DEFAULT_KINDERGARTEN_GROUPS.forEach((group, groupIndex) => {
      const educator = educators[groupIndex % Math.max(educators.length, 1)];
      seeded.push(
        ...createPlaceholderEnrollees(group.groupName, group.defaultCount, educator)
      );
    });
    setEnrollees(seeded);
  }

  function setPaymentStatus(
    enrollee: PreschoolEnrollee,
    status: ParentFoodPayment['status'],
    mealDays: number
  ) {
    const amount = status === 'paid' ? expectedFoodAmount(settings, enrollee, mealDays) : 0;
    const payment: ParentFoodPayment = {
      id: findFoodPayment(payments, enrollee.id, period)?.id ?? crypto.randomUUID(),
      enrolleeId: enrollee.id,
      period,
      amount,
      mealDays,
      status,
      paidAt: status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined,
    };
    setPayments((items) => upsertParentFoodPayment(items, payment));
  }

  function patchPaymentMealDays(enrollee: PreschoolEnrollee, mealDays: number) {
    const existing = findFoodPayment(payments, enrollee.id, period);
    const payment: ParentFoodPayment = {
      id: existing?.id ?? crypto.randomUUID(),
      enrolleeId: enrollee.id,
      period,
      amount: existing?.status === 'paid' ? expectedFoodAmount(settings, enrollee, mealDays) : 0,
      mealDays,
      status: existing?.status ?? 'pending',
      paidAt: existing?.paidAt,
      receiptNumber: existing?.receiptNumber,
    };
    setPayments((items) => upsertParentFoodPayment(items, payment));
  }

  return (
    <section
      id="finance-parent-food-payment"
      className="space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavParentFoodPayment')}</p>
          <h4 className="text-base font-bold">{t('parentFoodPaymentTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t('parentFoodPaymentSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printDocument('finance-parent-food-payment-document')}
            className="btn-primary text-xs"
            disabled={!canExport}
          >
            🖨 {t('parentFoodPaymentPrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-parent-food-payment-document"
            filename={parentFoodPaymentFileName(period)}
            disabled={!canExport}
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-4 text-xs leading-relaxed text-[var(--text-muted)] print:hidden">
        <p className="font-semibold text-[var(--text)]">{t('parentFoodPaymentLegalTitle')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {PARENT_FOOD_PAYMENT_LEGAL_BASIS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-amber-200/90">
          {PARENT_FOOD_PAYMENT_RULES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 print:hidden">
        <p className="text-xs font-semibold text-[var(--text)]">
          {t('parentFoodPaymentAccountsTitle')}
        </p>
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
          {t('parentFoodPaymentAccountsHint')}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {PARENT_FOOD_PAYMENT_ACCOUNT_INDICATORS.map((account) => (
            <div
              key={account.code}
              className="rounded-md border border-[var(--border)] bg-[var(--bg-input)]/40 p-3"
            >
              <p className="font-mono text-sm font-bold text-emerald-300">{account.code}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text)]">
                {t(account.labelKey)}
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">{account.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 print:hidden md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentFoodPaymentSchoolYear')}</span>
          <input
            value={settings.schoolYear}
            onChange={(event) =>
              setSettings({ ...settings, schoolYear: event.target.value })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentFoodPaymentMonth')}</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="input-field w-full text-xs"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentFoodPaymentDailyRate')}</span>
          <input
            value={String(settings.dailyFoodRateSomoni || '')}
            onChange={(event) =>
              setSettings({
                ...settings,
                dailyFoodRateSomoni: Number(event.target.value.replace(',', '.')) || 0,
              })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentFoodPaymentMealDays')}</span>
          <input
            type="number"
            min={1}
            max={31}
            value={settings.mealDaysPerMonth}
            onChange={(event) =>
              setSettings({
                ...settings,
                mealDaysPerMonth: Number(event.target.value) || DEFAULT_MEAL_DAYS_PER_MONTH,
              })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          />
        </label>
        <label className="space-y-1 text-xs md:col-span-2">
          <span className="field-label">{t('parentFoodPaymentTariffDecision')}</span>
          <input
            value={settings.tariffDecisionNumber ?? ''}
            onChange={(event) =>
              setSettings({ ...settings, tariffDecisionNumber: event.target.value })
            }
            className="input-field w-full text-xs"
            placeholder={t('parentFoodPaymentTariffDecisionPlaceholder')}
            disabled={!canEdit || saving}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentFoodPaymentTariffDate')}</span>
          <input
            type="date"
            value={settings.tariffDecisionDate ?? ''}
            onChange={(event) =>
              setSettings({ ...settings, tariffDecisionDate: event.target.value })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 print:hidden sm:grid-cols-4">
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentFoodPaymentActiveEnrollees')}</p>
          <p className="text-lg font-bold tabular-nums">{summary.activeEnrollees}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentFoodPaymentExpected')}</p>
          <p className="text-lg font-bold tabular-nums">{formatFoodAmount(summary.expectedTotal)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentFoodPaymentPaid')}</p>
          <p className="text-lg font-bold tabular-nums text-emerald-400">
            {formatFoodAmount(summary.paidTotal)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentFoodPaymentPending')}</p>
          <p className="text-lg font-bold tabular-nums text-amber-300">
            {formatFoodAmount(summary.pendingTotal)}
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={addEnrollee} className="btn-secondary text-xs">
            + {t('parentFoodPaymentAddEnrollee')}
          </button>
          <button type="button" onClick={seedGroups} className="btn-secondary text-xs">
            {t('parentFoodPaymentSeedGroups')}
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="btn-primary text-xs"
            disabled={saving}
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 print:hidden" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] print:hidden">
        <table className="data-table text-xs">
          <thead>
            <tr>
              <th>{t('parentFoodPaymentColGroup')}</th>
              <th>{t('parentFoodPaymentColChild')}</th>
              <th>{t('parentFoodPaymentColParent')}</th>
              <th className="text-right">{t('parentFoodPaymentColMealDays')}</th>
              <th className="text-right">{t('parentFoodPaymentColAmount')}</th>
              <th>{t('parentFoodPaymentColStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {activeEnrollees.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-[var(--text-muted)]">
                  {t('parentFoodPaymentNoEnrollees')}
                </td>
              </tr>
            ) : (
              activeEnrollees.map((enrollee) => {
                const payment = findFoodPayment(payments, enrollee.id, period);
                const mealDays = payment?.mealDays ?? settings.mealDaysPerMonth;
                const expected = expectedFoodAmount(settings, enrollee, mealDays);
                return (
                  <tr key={enrollee.id}>
                    <td>
                      <input
                        value={enrollee.groupName}
                        onChange={(event) =>
                          patchEnrollee(enrollee.id, { groupName: event.target.value })
                        }
                        className="input-field w-full min-w-[8rem] text-xs"
                        disabled={!canEdit || saving}
                      />
                    </td>
                    <td>
                      <input
                        value={enrollee.childFullName}
                        onChange={(event) =>
                          patchEnrollee(enrollee.id, { childFullName: event.target.value })
                        }
                        className="input-field w-full min-w-[8rem] text-xs"
                        disabled={!canEdit || saving}
                      />
                    </td>
                    <td>
                      <input
                        value={enrollee.parentFullName}
                        onChange={(event) =>
                          patchEnrollee(enrollee.id, { parentFullName: event.target.value })
                        }
                        className="input-field w-full min-w-[8rem] text-xs"
                        disabled={!canEdit || saving}
                      />
                    </td>
                    <td className="text-right">
                      <input
                        type="number"
                        min={0}
                        max={31}
                        value={mealDays}
                        onChange={(event) =>
                          patchPaymentMealDays(enrollee, Number(event.target.value) || 0)
                        }
                        className="input-field w-16 text-right text-xs"
                        disabled={!canEdit || saving}
                      />
                    </td>
                    <td className="text-right tabular-nums">{formatFoodAmount(expected)}</td>
                    <td>
                      {canEdit ? (
                        <select
                          value={payment?.status ?? 'pending'}
                          onChange={(event) =>
                            setPaymentStatus(
                              enrollee,
                              event.target.value as ParentFoodPayment['status'],
                              mealDays
                            )
                          }
                          className="input-field text-xs"
                          disabled={saving}
                        >
                          <option value="pending">{t('parentFoodPaymentStatusPending')}</option>
                          <option value="paid">{t('parentFoodPaymentStatusPaid')}</option>
                          <option value="exempt">{t('parentFoodPaymentStatusExempt')}</option>
                        </select>
                      ) : (
                        foodPaymentStatusLabel(payment?.status ?? 'pending', t)
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {journalEntries.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 print:hidden">
          <p className="text-xs font-semibold">{t('parentFoodPaymentJournalTitle')}</p>
          <table className="data-table mt-2 text-xs">
            <thead>
              <tr>
                <th>{t('parentFoodPaymentJournalDebit')}</th>
                <th>{t('parentFoodPaymentJournalCredit')}</th>
                <th className="text-right">{t('parentFoodPaymentColAmount')}</th>
                <th>{t('parentFoodPaymentJournalDescription')}</th>
              </tr>
            </thead>
            <tbody>
              {journalEntries.map((entry) => (
                <tr key={`${entry.debitAccount}-${entry.creditAccount}-${entry.descriptionKey}`}>
                  <td className="font-mono">{entry.debitAccount}</td>
                  <td className="font-mono">{entry.creditAccount}</td>
                  <td className="text-right tabular-nums">{formatFoodAmount(entry.amount)}</td>
                  <td>{t(entry.descriptionKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canExport && (
        <article
          id="finance-parent-food-payment-document"
          className="rounded-xl border border-[var(--border)] bg-white/5 p-5 md:p-6"
        >
          <OrganizationReportDocumentHeader />

          <div className="py-4 text-center">
            <h6 className="text-base font-bold uppercase tracking-wide md:text-lg">
              {t('parentFoodPaymentDocumentTitle')}
            </h6>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {reportOrganizationName || organization?.name}
            </p>
            <p className="mt-2 text-xs">
              {t('parentFoodPaymentSchoolYear')}:{' '}
              <span className="font-semibold">{settings.schoolYear}</span> ·{' '}
              {t('parentFoodPaymentMonth')}:{' '}
              <span className="font-semibold">{period}</span>
            </p>
            <p className="mt-1 text-xs">
              {t('parentFoodPaymentDailyRate')}:{' '}
              <span className="font-semibold">
                {formatFoodAmount(settings.dailyFoodRateSomoni)} {t('parentFoodPaymentPerDay')}
              </span>
            </p>
            {settings.tariffDecisionNumber && (
              <p className="mt-1 text-xs">
                {t('parentFoodPaymentTariffDecision')}:{' '}
                <span className="font-semibold">{settings.tariffDecisionNumber}</span>
                {settings.tariffDecisionDate
                  ? ` (${formatAppDate(settings.tariffDecisionDate, locale)})`
                  : ''}
              </p>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            {PARENT_FOOD_PAYMENT_ACCOUNT_INDICATORS.map((account) => (
              <p key={account.code}>
                <span className="font-mono font-bold">{account.code}</span> — {t(account.labelKey)}
              </p>
            ))}
          </div>

          <div className="table-wrapper table-scroll-sm">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('parentFoodPaymentColGroup')}</th>
                  <th>{t('parentFoodPaymentColChild')}</th>
                  <th>{t('parentFoodPaymentColParent')}</th>
                  <th className="text-right">{t('parentFoodPaymentColMealDays')}</th>
                  <th className="text-right">{t('parentFoodPaymentColAmount')}</th>
                  <th>{t('parentFoodPaymentColStatus')}</th>
                  <th>{t('parentFoodPaymentColPaidAt')}</th>
                </tr>
              </thead>
              <tbody>
                {activeEnrollees.map((enrollee, index) => {
                  const payment = findFoodPayment(payments, enrollee.id, period);
                  const mealDays = payment?.mealDays ?? settings.mealDaysPerMonth;
                  return (
                    <tr key={enrollee.id}>
                      <td>{index + 1}</td>
                      <td>{enrollee.groupName}</td>
                      <td>{enrollee.childFullName}</td>
                      <td>{enrollee.parentFullName}</td>
                      <td className="text-right tabular-nums">{mealDays}</td>
                      <td className="text-right tabular-nums">
                        {formatFoodAmount(expectedFoodAmount(settings, enrollee, mealDays))}
                      </td>
                      <td>{foodPaymentStatusLabel(payment?.status ?? 'pending', t)}</td>
                      <td>
                        {payment?.paidAt
                          ? formatAppDate(payment.paidAt, locale)
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={5}>{t('parentFoodPaymentDocumentTotal')}</td>
                  <td className="text-right tabular-nums">
                    {formatFoodAmount(summary.expectedTotal)}
                  </td>
                  <td colSpan={2}>
                    {t('parentFoodPaymentDocumentPaidSummary', {
                      paid: formatFoodAmount(summary.paidTotal),
                      pending: formatFoodAmount(summary.pendingTotal),
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {journalEntries.length > 0 && (
            <div className="mt-6 table-wrapper table-scroll-sm">
              <p className="mb-2 text-xs font-semibold">{t('parentFoodPaymentJournalTitle')}</p>
              <table>
                <thead>
                  <tr>
                    <th>{t('parentFoodPaymentJournalDebit')}</th>
                    <th>{t('parentFoodPaymentJournalCredit')}</th>
                    <th className="text-right">{t('parentFoodPaymentColAmount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {journalEntries.map((entry) => (
                    <tr key={`print-${entry.descriptionKey}`}>
                      <td className="font-mono">{entry.debitAccount}</td>
                      <td className="font-mono">{entry.creditAccount}</td>
                      <td className="text-right tabular-nums">{formatFoodAmount(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {t('parentFoodPaymentDocumentNote')}
          </p>

          <OrganizationDocumentSignatureFooter
            director={signatures.director}
            accountant={signatures.accountant}
            sealLabel={signatures.sealLabel}
          />
        </article>
      )}
    </section>
  );
}
