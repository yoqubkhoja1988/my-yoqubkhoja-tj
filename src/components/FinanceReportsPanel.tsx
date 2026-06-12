'use client';

import FinanceReportForm5Panel from '@/components/FinanceReportForm5Panel';
import {
  FINANCIAL_REPORT_INSTRUCTION,
  FINANCIAL_REPORT_FORMS,
  FinancialReportPeriod,
  childFinancialReportForms,
  rootFinancialReportForms,
} from '@/lib/financial-reports-catalog';
import { form5TablesFromAll } from '@/lib/financial-report-form5';
import { SectionItem, SectionTable } from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { type ReactNode, useMemo, useState } from 'react';

type Props = {
  summary?: string;
  items?: SectionItem[];
  tables?: SectionTable[];
  editing?: boolean;
  onItemsChange?: (items: SectionItem[]) => void;
  onForm5CellChange?: (
    tableIndex: number,
    rowIndex: number,
    cellIndex: number,
    value: string
  ) => void;
  onForm5AddRow?: (tableIndex: number) => void;
  onInitForm5?: () => void;
};

type TabId = FinancialReportPeriod | 'form5' | 'deadlines';

function attachmentForForm(items: SectionItem[], formId: string): SectionItem | undefined {
  return items.find((item) => item.reportFormId === formId);
}

function upsertFormAttachment(
  items: SectionItem[],
  formId: string,
  patch: Partial<SectionItem>
): SectionItem[] {
  const form = FINANCIAL_REPORT_FORMS.find((entry) => entry.id === formId);
  const index = items.findIndex((item) => item.reportFormId === formId);
  const base: SectionItem = {
    title: form ? form.formCode : formId,
    reportFormId: formId,
  };

  if (index >= 0) {
    const next = [...items];
    next[index] = { ...next[index], ...patch, reportFormId: formId };
    return next;
  }

  return [...items, { ...base, ...patch, reportFormId: formId }];
}

function FormCard({
  formId,
  formCode,
  title,
  attachment,
  editing,
  onPatch,
  children,
  t,
}: {
  formId: string;
  formCode: string;
  title: string;
  attachment?: SectionItem;
  editing?: boolean;
  onPatch?: (patch: Partial<SectionItem>) => void;
  children?: ReactNode;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-md bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
            {t('financeReportFormLabel', { code: formCode })}
          </span>
          <p className="mt-1.5 text-sm font-semibold leading-snug">{title}</p>
        </div>
        {!editing && attachment?.url ? (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            {t('financeReportsOpen')} ↗
          </a>
        ) : !editing ? (
          <span className="shrink-0 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
            {t('financeReportPending')}
          </span>
        ) : null}
      </div>

      {editing && onPatch && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          <div>
            <label className="field-label">{t('financeReportFieldPeriod')}</label>
            <input
              type="text"
              value={attachment?.detail ?? ''}
              onChange={(e) => onPatch({ detail: e.target.value })}
              className="input-field text-xs"
              placeholder={t('financeReportFieldPeriodPlaceholder')}
            />
          </div>
          <div>
            <label className="field-label">{t('legalDocFieldUrl')}</label>
            <input
              type="url"
              value={attachment?.url ?? ''}
              onChange={(e) => onPatch({ url: e.target.value })}
              className="input-field text-xs"
              placeholder={t('legalDocUrlPlaceholder')}
            />
          </div>
          <div>
            <label className="field-label">{t('legalDocFieldDescription')}</label>
            <input
              type="text"
              value={attachment?.description ?? ''}
              onChange={(e) => onPatch({ description: e.target.value })}
              className="input-field text-xs"
              placeholder={t('financeReportFieldFilePlaceholder')}
            />
          </div>
        </div>
      )}

      {!editing && attachment?.detail && (
        <p className="mt-2 text-xs font-medium text-[var(--accent)]">{attachment.detail}</p>
      )}
      {!editing && attachment?.description && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{attachment.description}</p>
      )}

      {children ? (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">{children}</div>
      ) : null}
    </article>
  );
}

export default function FinanceReportsPanel({
  summary,
  items = [],
  tables = [],
  editing = false,
  onItemsChange,
  onForm5CellChange,
  onForm5AddRow,
  onInitForm5,
}: Props) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabId>('form5');

  const form5Tables = useMemo(() => form5TablesFromAll(tables), [tables]);

  const tabs: { id: TabId; label: string }[] = useMemo(
    () => [
      { id: 'form5', label: t('financeReportsTabForm5') },
      { id: 'annual', label: t('financeReportsTabAnnual') },
      { id: 'quarterly', label: t('financeReportsTabQuarterly') },
      { id: 'deadlines', label: t('financeReportsTabDeadlines') },
    ],
    [t]
  );

  function patchForm(formId: string, patch: Partial<SectionItem>) {
    if (!onItemsChange) return;
    onItemsChange(upsertFormAttachment(items, formId, patch));
  }

  function renderFormTree(period: FinancialReportPeriod) {
    return (
      <div className="grid gap-3">
        {rootFinancialReportForms(period).map((form) => {
          const children = childFinancialReportForms(form.id, period);
          return (
            <FormCard
              key={form.id}
              formId={form.id}
              formCode={form.formCode}
              title={t(form.titleKey)}
              attachment={attachmentForForm(items, form.id)}
              editing={editing}
              onPatch={(patch) => patchForm(form.id, patch)}
              t={t}
            >
              {children.map((child) => (
                <FormCard
                  key={child.id}
                  formId={child.id}
                  formCode={child.formCode}
                  title={t(child.titleKey)}
                  attachment={attachmentForForm(items, child.id)}
                  editing={editing}
                  onPatch={(patch) => patchForm(child.id, patch)}
                  t={t}
                />
              ))}
            </FormCard>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="page-eyebrow">{t('financeReportsEyebrow')}</p>
        <h4 className="text-sm font-bold">{t('financeReportsTitle')}</h4>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          {summary || t('financeReportsDefaultSummary')}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 text-xs leading-relaxed text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">{t(FINANCIAL_REPORT_INSTRUCTION.titleKey)}</p>
        <p className="mt-1">
          {t('financeReportsInstructionMeta', {
            number: FINANCIAL_REPORT_INSTRUCTION.number,
            date: FINANCIAL_REPORT_INSTRUCTION.date,
          })}
        </p>
        <p className="mt-1">{t(FINANCIAL_REPORT_INSTRUCTION.issuerKey)}</p>
        <p className="mt-1">{t(FINANCIAL_REPORT_INSTRUCTION.standardKey)}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[var(--accent)] to-indigo-500 text-white shadow-md shadow-blue-500/20'
                : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'form5' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{t('financeReportForm5Intro')}</p>
          {form5Tables.length === 0 && editing && onInitForm5 ? (
            <button type="button" onClick={onInitForm5} className="btn-primary text-xs">
              {t('financeReportForm5Init')}
            </button>
          ) : (
            <FinanceReportForm5Panel
              tables={form5Tables}
              editing={editing}
              onCellChange={onForm5CellChange}
              onAddRow={onForm5AddRow}
            />
          )}
        </div>
      )}

      {activeTab === 'annual' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{t('financeReportsAnnualNote')}</p>
          {renderFormTree('annual')}
        </div>
      )}

      {activeTab === 'quarterly' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{t('financeReportsQuarterlyNote')}</p>
          {renderFormTree('quarterly')}
        </div>
      )}

      {activeTab === 'deadlines' && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            'financeReportsDeadlineAnnual',
            'financeReportsDeadlineQuarterly',
            'financeReportsDeadlineForm5',
            'financeReportsDeadlineForm6',
          ].map((key) => (
            <div
              key={key}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/30 p-3"
            >
              <dt className="text-xs font-bold text-[var(--text)]">{t(`${key}Title`)}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {t(`${key}Body`)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
