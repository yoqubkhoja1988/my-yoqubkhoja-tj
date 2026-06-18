'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import {
  DEFAULT_KINDERGARTEN_GROUPS,
  PARENT_MEMBERSHIP_FEE_LEGAL_BASIS,
  PARENT_MEMBERSHIP_FEE_RULES,
  activePreschoolEnrollees,
  createPlaceholderEnrollees,
  currentSchoolYear,
  educatorOptions,
  expectedFeeAmount,
  findPayment,
  formatMembershipAmount,
  parentMembershipFeeFileName,
  paymentPeriodForSettings,
  paymentStatusLabel,
  resolveParentMembershipFeeSettings,
  summarizeParentMembershipFees,
  upsertParentMembershipPayment,
} from '@/lib/finance-parent-membership-fee';
import { resolveOrganizationDocumentSignatures } from '@/lib/organization-document-signatures';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { formatAppDate } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { Organization } from '@/types/organization';
import {
  OrganizationSectionContent,
  ParentMembershipFeePayment,
  ParentMembershipFeeSettings,
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

function emptyEnrollee(): PreschoolEnrollee {
  return {
    id: crypto.randomUUID(),
    groupName: '',
    childFullName: '',
    parentFullName: '',
    active: true,
  };
}

export default function FinanceParentMembershipFeePanel({
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
    resolveParentMembershipFeeSettings(financeContent)
  );
  const [enrollees, setEnrollees] = useState<PreschoolEnrollee[]>(
    () => financeContent.preschoolEnrollees ?? []
  );
  const [payments, setPayments] = useState<ParentMembershipFeePayment[]>(
    () => financeContent.parentMembershipFeePayments ?? []
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
  const period = paymentPeriodForSettings(settings, month);
  const summary = useMemo(
    () => summarizeParentMembershipFees(settings, enrollees, payments, period),
    [settings, enrollees, payments, period]
  );
  const activeEnrollees = useMemo(() => activePreschoolEnrollees(enrollees), [enrollees]);
  const canExport = activeEnrollees.length > 0;

  async function persist(
    nextSettings: ParentMembershipFeeSettings,
    nextEnrollees: PreschoolEnrollee[],
    nextPayments: ParentMembershipFeePayment[]
  ) {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      parentMembershipFeeSettings: nextSettings,
      preschoolEnrollees: nextEnrollees,
      parentMembershipFeePayments: nextPayments,
    };
    try {
      const saved = await updateOrganizationSection(organizationId, 'finance', payload);
      if (!saved) {
        setError(t('sectionSaveError'));
        return;
      }
      onUpdate({
        ...saved,
        parentMembershipFeeSettings:
          saved.parentMembershipFeeSettings ?? payload.parentMembershipFeeSettings,
        preschoolEnrollees: saved.preschoolEnrollees ?? payload.preschoolEnrollees,
        parentMembershipFeePayments:
          saved.parentMembershipFeePayments ?? payload.parentMembershipFeePayments,
      });
      setSettings(resolveParentMembershipFeeSettings(saved));
      setEnrollees(saved.preschoolEnrollees ?? nextEnrollees);
      setPayments(saved.parentMembershipFeePayments ?? nextPayments);
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
    setEnrollees((items) => [...items, emptyEnrollee()]);
  }

  function removeEnrollee(id: string) {
    setEnrollees((items) => items.filter((item) => item.id !== id));
    setPayments((items) => items.filter((item) => item.enrolleeId !== id));
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
    status: ParentMembershipFeePayment['status']
  ) {
    const amount = status === 'paid' ? expectedFeeAmount(settings, enrollee) : 0;
    const payment: ParentMembershipFeePayment = {
      id: findPayment(payments, enrollee.id, period)?.id ?? crypto.randomUUID(),
      enrolleeId: enrollee.id,
      period,
      amount,
      status,
      paidAt: status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined,
    };
    setPayments((items) => upsertParentMembershipPayment(items, payment));
  }

  return (
    <section
      id="finance-parent-membership-fee"
      className="space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavParentMembershipFee')}</p>
          <h4 className="text-base font-bold">{t('parentMembershipFeeTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {t('parentMembershipFeeSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printDocument('finance-parent-membership-fee-document')}
            className="btn-primary text-xs"
            disabled={!canExport}
          >
            🖨 {t('parentMembershipFeePrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-parent-membership-fee-document"
            filename={parentMembershipFeeFileName(settings.schoolYear)}
            disabled={!canExport}
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-4 text-xs leading-relaxed text-[var(--text-muted)] print:hidden">
        <p className="font-semibold text-[var(--text)]">{t('parentMembershipFeeLegalTitle')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {PARENT_MEMBERSHIP_FEE_LEGAL_BASIS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-amber-200/90">
          {PARENT_MEMBERSHIP_FEE_RULES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 print:hidden md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentMembershipFeeSchoolYear')}</span>
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
          <span className="field-label">{t('parentMembershipFeePeriodKind')}</span>
          <select
            value={settings.periodKind}
            onChange={(event) =>
              setSettings({
                ...settings,
                periodKind: event.target.value as ParentMembershipFeeSettings['periodKind'],
              })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          >
            <option value="annual">{t('parentMembershipFeePeriodAnnual')}</option>
            <option value="monthly">{t('parentMembershipFeePeriodMonthly')}</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentMembershipFeeAmount')}</span>
          <input
            value={String(settings.feePerChildSomoni || '')}
            onChange={(event) =>
              setSettings({
                ...settings,
                feePerChildSomoni: Number(event.target.value.replace(',', '.')) || 0,
              })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          />
        </label>
        {settings.periodKind === 'monthly' && (
          <label className="space-y-1 text-xs">
            <span className="field-label">{t('parentMembershipFeeMonth')}</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="input-field w-full text-xs"
            />
          </label>
        )}
        <label className="space-y-1 text-xs md:col-span-2">
          <span className="field-label">{t('parentMembershipFeeCommitteeDecision')}</span>
          <input
            value={settings.committeeDecisionNumber ?? ''}
            onChange={(event) =>
              setSettings({ ...settings, committeeDecisionNumber: event.target.value })
            }
            className="input-field w-full text-xs"
            placeholder={t('parentMembershipFeeCommitteeDecisionPlaceholder')}
            disabled={!canEdit || saving}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentMembershipFeeCommitteeDate')}</span>
          <input
            type="date"
            value={settings.committeeDecisionDate ?? ''}
            onChange={(event) =>
              setSettings({ ...settings, committeeDecisionDate: event.target.value })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          />
        </label>
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('parentMembershipFeeCommitteeChair')}</span>
          <input
            value={settings.committeeChair ?? ''}
            onChange={(event) =>
              setSettings({ ...settings, committeeChair: event.target.value })
            }
            className="input-field w-full text-xs"
            disabled={!canEdit || saving}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentMembershipFeeActiveEnrollees')}</p>
          <p className="mt-0.5 text-xl font-bold">{summary.activeEnrollees}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentMembershipFeeExpected')}</p>
          <p className="mt-0.5 text-xl font-bold">{formatMembershipAmount(summary.expectedTotal)}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentMembershipFeePaid')}</p>
          <p className="mt-0.5 text-xl font-bold text-emerald-400">
            {formatMembershipAmount(summary.paidTotal)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-[var(--text-muted)]">{t('parentMembershipFeePending')}</p>
          <p className="mt-0.5 text-xl font-bold text-amber-400">
            {formatMembershipAmount(summary.pendingTotal)}
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" className="btn-secondary text-xs" onClick={addEnrollee} disabled={saving}>
            + {t('parentMembershipFeeAddEnrollee')}
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={seedGroups} disabled={saving}>
            {t('parentMembershipFeeSeedGroups')}
          </button>
          <button type="button" className="btn-primary text-xs" onClick={handleSaveAll} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300 print:hidden">
          {error}
        </p>
      )}

      <div className="table-wrapper table-scroll-sm print:hidden">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>{t('parentMembershipFeeColGroup')}</th>
              <th>{t('parentMembershipFeeColChild')}</th>
              <th>{t('parentMembershipFeeColParent')}</th>
              <th>{t('parentMembershipFeeColEducator')}</th>
              <th className="text-right">{t('parentMembershipFeeColAmount')}</th>
              <th>{t('parentMembershipFeeColStatus')}</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {activeEnrollees.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="text-center text-[var(--text-muted)]">
                  {t('parentMembershipFeeNoEnrollees')}
                </td>
              </tr>
            ) : (
              activeEnrollees.map((enrollee, index) => {
                const payment = findPayment(payments, enrollee.id, period);
                const status = payment?.status ?? 'pending';
                return (
                  <tr key={enrollee.id}>
                    <td>{index + 1}</td>
                    <td>
                      {canEdit ? (
                        <input
                          value={enrollee.groupName}
                          onChange={(event) =>
                            patchEnrollee(enrollee.id, { groupName: event.target.value })
                          }
                          className="input-field w-full min-w-[8rem] text-xs"
                        />
                      ) : (
                        enrollee.groupName
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          value={enrollee.childFullName}
                          onChange={(event) =>
                            patchEnrollee(enrollee.id, { childFullName: event.target.value })
                          }
                          className="input-field w-full min-w-[10rem] text-xs"
                        />
                      ) : (
                        enrollee.childFullName
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          value={enrollee.parentFullName}
                          onChange={(event) =>
                            patchEnrollee(enrollee.id, { parentFullName: event.target.value })
                          }
                          className="input-field w-full min-w-[10rem] text-xs"
                        />
                      ) : (
                        enrollee.parentFullName || '—'
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          value={enrollee.educatorEmployeeId ?? ''}
                          onChange={(event) => {
                            const educator = educators.find(
                              (item) => item.id === event.target.value
                            );
                            patchEnrollee(enrollee.id, {
                              educatorEmployeeId: event.target.value || undefined,
                              educatorName: educator?.fullName,
                            });
                          }}
                          className="input-field w-full min-w-[10rem] text-xs"
                        >
                          <option value="">{t('parentMembershipFeeEducatorNone')}</option>
                          {educators.map((educator) => (
                            <option key={educator.id} value={educator.id}>
                              {educator.fullName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        enrollee.educatorName || '—'
                      )}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatMembershipAmount(expectedFeeAmount(settings, enrollee))}
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          value={status}
                          onChange={(event) =>
                            setPaymentStatus(
                              enrollee,
                              event.target.value as ParentMembershipFeePayment['status']
                            )
                          }
                          className="input-field w-full text-xs"
                        >
                          <option value="pending">{t('parentMembershipFeeStatusPending')}</option>
                          <option value="paid">{t('parentMembershipFeeStatusPaid')}</option>
                          <option value="exempt">{t('parentMembershipFeeStatusExempt')}</option>
                        </select>
                      ) : (
                        paymentStatusLabel(status, t)
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          type="button"
                          className="btn-danger px-2 py-1 text-[10px]"
                          onClick={() => removeEnrollee(enrollee.id)}
                        >
                          {t('sickLeaveDelete')}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {canExport && (
        <article
          id="finance-parent-membership-fee-document"
          className="rounded-xl border border-[var(--border)] bg-white/5 p-5 md:p-6"
        >
          <OrganizationReportDocumentHeader />

          <div className="py-4 text-center">
            <h6 className="text-base font-bold uppercase tracking-wide md:text-lg">
              {t('parentMembershipFeeDocumentTitle')}
            </h6>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {reportOrganizationName || organization?.name}
            </p>
            <p className="mt-2 text-xs">
              {t('parentMembershipFeeSchoolYear')}:{' '}
              <span className="font-semibold">{settings.schoolYear}</span>
            </p>
            <p className="mt-1 text-xs">
              {t('parentMembershipFeeDocumentPeriod')}:{' '}
              <span className="font-semibold">{period}</span>
            </p>
            {settings.committeeDecisionNumber && (
              <p className="mt-1 text-xs">
                {t('parentMembershipFeeCommitteeDecision')}:{' '}
                <span className="font-semibold">{settings.committeeDecisionNumber}</span>
                {settings.committeeDecisionDate
                  ? ` (${formatAppDate(settings.committeeDecisionDate, locale)})`
                  : ''}
              </p>
            )}
          </div>

          <div className="table-wrapper table-scroll-sm">
            <table>
              <thead>
                <tr>
                  <th>№</th>
                  <th>{t('parentMembershipFeeColGroup')}</th>
                  <th>{t('parentMembershipFeeColChild')}</th>
                  <th>{t('parentMembershipFeeColParent')}</th>
                  <th>{t('parentMembershipFeeColEducator')}</th>
                  <th className="text-right">{t('parentMembershipFeeColAmount')}</th>
                  <th>{t('parentMembershipFeeColStatus')}</th>
                  <th>{t('parentMembershipFeeColPaidAt')}</th>
                </tr>
              </thead>
              <tbody>
                {activeEnrollees.map((enrollee, index) => {
                  const payment = findPayment(payments, enrollee.id, period);
                  const status = payment?.status ?? 'pending';
                  return (
                    <tr key={enrollee.id}>
                      <td>{index + 1}</td>
                      <td>{enrollee.groupName}</td>
                      <td>{enrollee.childFullName}</td>
                      <td>{enrollee.parentFullName || '—'}</td>
                      <td>{enrollee.educatorName || '—'}</td>
                      <td className="text-right tabular-nums">
                        {formatMembershipAmount(expectedFeeAmount(settings, enrollee))}
                      </td>
                      <td>{paymentStatusLabel(status, t)}</td>
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
                  <td colSpan={5}>{t('parentMembershipFeeDocumentTotal')}</td>
                  <td className="text-right tabular-nums">
                    {formatMembershipAmount(summary.expectedTotal)}
                  </td>
                  <td colSpan={2}>
                    {t('parentMembershipFeeDocumentPaidSummary', {
                      paid: formatMembershipAmount(summary.paidTotal),
                      pending: formatMembershipAmount(summary.pendingTotal),
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {t('parentMembershipFeeDocumentNote')}
          </p>

          <OrganizationDocumentSignatureFooter
            director={signatures.director}
            accountant={signatures.accountant}
            sealLabel={signatures.sealLabel}
            extraRows={[
              [
                {
                  label: t('parentMembershipFeeCommitteeChair'),
                  name: settings.committeeChair,
                },
              ],
            ]}
          />
        </article>
      )}
    </section>
  );
}
