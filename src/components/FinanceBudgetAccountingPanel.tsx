'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import FinanceMemorialOrdersPanel from '@/components/FinanceMemorialOrdersPanel';
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import {
  BUDGET_ACCOUNTING_RULES,
  BUDGET_OPERATION_CATEGORIES,
  BUDGET_OPERATION_TEMPLATES,
  budgetAccountingFileName,
  computeAccountTurnover,
  entryToMemorialRows,
  findOperationTemplate,
  formatEntryDocument,
  formatJournalAmount,
  nextJournalEntryNumber,
  removeBudgetJournalEntry,
  resolveBudgetAccountingSettings,
  upsertBudgetJournalEntry,
  validateJournalEntry,
} from '@/lib/budget-accounting-journal';
import {
  MemorialOrderOperation,
  MemorialOrderOperationOverride,
} from '@/lib/memorial-orders-catalog';
import {
  NYAH_ACCOUNT_CLASSES,
  NYAH_ACCOUNTS,
  NYAH_INSTRUCTION,
  NYAH_LEGAL_BASIS,
  NyahAccountClassId,
  accountsByClass,
  findNyahAccount,
  isSyntheticNyahAccount,
  resolveNyahAccountName,
  searchNyahAccounts,
} from '@/lib/budget-unified-chart-of-accounts';
import { resolveOrganizationDocumentSignatures } from '@/lib/organization-document-signatures';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { formatAppDate } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { useOrganizationReportHeader } from '@/contexts/organization-report-header-context';
import { Organization } from '@/types/organization';
import {
  BudgetAccountingJournalEntry,
  OrganizationSectionContent,
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

type TabId = 'chart' | 'memorial' | 'journal' | 'turnover';

function emptyEntry(
  settings: ReturnType<typeof resolveBudgetAccountingSettings>,
  entries: BudgetAccountingJournalEntry[]
): BudgetAccountingJournalEntry {
  return {
    id: crypto.randomUUID(),
    entryNumber: nextJournalEntryNumber(settings, entries),
    date: new Date().toISOString().slice(0, 10),
    description: '',
    lines: [
      { accountCode: '', debit: 0, credit: 0 },
      { accountCode: '', debit: 0, credit: 0 },
    ],
  };
}

export default function FinanceBudgetAccountingPanel({
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
    resolveBudgetAccountingSettings(financeContent)
  );
  const [entries, setEntries] = useState<BudgetAccountingJournalEntry[]>(
    () => financeContent.budgetAccountingJournal ?? []
  );
  const [customMemorialOperations, setCustomMemorialOperations] = useState<
    Record<string, MemorialOrderOperation[]>
  >(() => financeContent.memorialOrderCustomOperations ?? {});
  const [memorialOperationOverrides, setMemorialOperationOverrides] = useState<
    Record<string, MemorialOrderOperationOverride>
  >(() => financeContent.memorialOrderOperationOverrides ?? {});
  const [tab, setTab] = useState<TabId>('chart');
  const [classFilter, setClassFilter] = useState<NyahAccountClassId | ''>('');
  const [accountSearch, setAccountSearch] = useState('');
  const [syntheticOnly, setSyntheticOnly] = useState(true);
  const [draft, setDraft] = useState<BudgetAccountingJournalEntry | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(
    BUDGET_OPERATION_TEMPLATES.find((item) => item.category === 'memorial')?.id ??
      BUDGET_OPERATION_TEMPLATES[0]?.id ??
      ''
  );
  const [templateAmount, setTemplateAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const signatures = resolveOrganizationDocumentSignatures(t, {
    organizationId,
    organization,
    staffContent,
  });

  const filteredAccounts = useMemo(() => {
    let list = accountsByClass(classFilter || undefined);
    if (syntheticOnly && !accountSearch.trim()) {
      list = list.filter((item) => isSyntheticNyahAccount(item.code));
    }
    if (!accountSearch.trim()) return list;
    const codes = new Set(searchNyahAccounts(accountSearch).map((a) => a.code));
    return list.filter((item) => codes.has(item.code));
  }, [classFilter, accountSearch, syntheticOnly]);

  const turnover = useMemo(
    () => computeAccountTurnover(entries, settings.fiscalYear),
    [entries, settings.fiscalYear]
  );

  const yearEntries = useMemo(
    () => entries.filter((entry) => entry.date.startsWith(settings.fiscalYear)),
    [entries, settings.fiscalYear]
  );

  const memorialRows = useMemo(
    () =>
      yearEntries.flatMap((entry) => {
        const rows = entryToMemorialRows(entry);
        return rows.map((row, rowIndex) => ({
          entry,
          row,
          rowIndex,
          rowCount: rows.length,
        }));
      }),
    [yearEntries]
  );

  function accountLabel(code: string): string {
    const account = findNyahAccount(code);
    return account ? resolveNyahAccountName(account, locale, t) : code;
  }

  async function persist(
    nextSettings: typeof settings,
    nextEntries: BudgetAccountingJournalEntry[],
    nextCustomOps: Record<string, MemorialOrderOperation[]> = customMemorialOperations,
    nextOperationOverrides: Record<string, MemorialOrderOperationOverride> = memorialOperationOverrides
  ) {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      budgetAccountingSettings: nextSettings,
      budgetAccountingJournal: nextEntries,
      memorialOrderCustomOperations: nextCustomOps,
      memorialOrderOperationOverrides: nextOperationOverrides,
    };
    try {
      const saved = await updateOrganizationSection(organizationId, 'finance', payload);
      if (!saved) {
        setError(t('sectionSaveError'));
        return;
      }
      onUpdate({
        ...saved,
        budgetAccountingSettings: saved.budgetAccountingSettings ?? payload.budgetAccountingSettings,
        budgetAccountingJournal: saved.budgetAccountingJournal ?? payload.budgetAccountingJournal,
        memorialOrderCustomOperations:
          saved.memorialOrderCustomOperations ?? payload.memorialOrderCustomOperations,
        memorialOrderOperationOverrides:
          saved.memorialOrderOperationOverrides ?? payload.memorialOrderOperationOverrides,
      });
      setSettings(resolveBudgetAccountingSettings(saved));
      setEntries(saved.budgetAccountingJournal ?? nextEntries);
      setCustomMemorialOperations(
        saved.memorialOrderCustomOperations ?? nextCustomOps
      );
      setMemorialOperationOverrides(
        saved.memorialOrderOperationOverrides ?? nextOperationOverrides
      );
    } catch {
      setError(t('sectionSaveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll() {
    await persist(settings, entries);
  }

  function startNewEntry() {
    setDraft(emptyEntry(settings, entries));
    setTab('journal');
  }

  function applyTemplate() {
    const template = findOperationTemplate(selectedTemplate);
    const amount = Number(templateAmount.replace(',', '.')) || 0;
    if (!template || amount <= 0) return;

    const entry = emptyEntry(settings, entries);
    entry.operationTemplateId = template.id;
    entry.description = t(template.labelKey);
    entry.documentType = t(template.documentTypeKey);
    if (template.instructionRef) {
      entry.description = `${entry.description} (${template.instructionRef})`;
    }
    entry.lines = template.buildLines(amount);
    setDraft(entry);
  }

  async function saveDraft() {
    if (!draft) return;
    const validationError = validateJournalEntry(draft);
    if (validationError) {
      setError(t(validationError));
      return;
    }
    const nextEntries = upsertBudgetJournalEntry(entries, {
      ...draft,
      createdAt: draft.createdAt ?? new Date().toISOString(),
    });
    const nextSettings = {
      ...settings,
      nextEntryNumber: draft.entryNumber + 1,
    };
    setEntries(nextEntries);
    setSettings(nextSettings);
    setDraft(null);
    setError('');
    await persist(nextSettings, nextEntries);
  }

  async function deleteEntry(id: string) {
    const nextEntries = removeBudgetJournalEntry(entries, id);
    setEntries(nextEntries);
    await persist(settings, nextEntries);
  }

  return (
    <section
      id="finance-budget-accounting"
      className="space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('financeNavBudgetAccounting')}</p>
          <h4 className="text-base font-bold">{t('nyahTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('nyahSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printDocument('finance-budget-accounting-document')}
            className="btn-primary text-xs"
            disabled={yearEntries.length === 0}
          >
            🖨 {t('nyahPrint')}
          </button>
          <DocumentExportMenu
            documentId="finance-budget-accounting-document"
            filename={budgetAccountingFileName(settings.fiscalYear)}
            disabled={yearEntries.length === 0}
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-4 text-xs leading-relaxed text-[var(--text-muted)] print:hidden">
        <p className="font-semibold text-[var(--text)]">{t('nyahLegalTitle')}</p>
        <p className="mt-1">
          {t('nyahInstructionRef', {
            number: NYAH_INSTRUCTION.number,
            date: NYAH_INSTRUCTION.date,
            issuer: NYAH_INSTRUCTION.issuer,
          })}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {NYAH_LEGAL_BASIS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <ul className="mt-3 list-disc space-y-1 pl-4 text-amber-200/90">
          {BUDGET_ACCOUNTING_RULES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4 print:hidden">
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('nyahFiscalYear')}</span>
          <input
            value={settings.fiscalYear}
            onChange={(event) => setSettings({ ...settings, fiscalYear: event.target.value })}
            className="input-field w-28 text-xs"
            disabled={!canEdit || saving}
          />
        </label>
        {canEdit && (
          <>
            <button type="button" onClick={startNewEntry} className="btn-secondary text-xs">
              + {t('nyahAddEntry')}
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="btn-primary text-xs"
              disabled={saving}
            >
              {saving ? t('saving') : t('save')}
            </button>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1 print:hidden">
        {(
          [
            ['chart', 'nyahTabChart'],
            ['memorial', 'nyahTabMemorial'],
            ['journal', 'nyahTabJournal'],
            ['turnover', 'nyahTabTurnover'],
          ] as const
        ).map(([id, labelKey]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === id
                ? 'bg-[var(--accent)]/20 text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:bg-white/5'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 print:hidden" role="alert">
          {error}
        </p>
      )}

      {tab === 'chart' && (
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap gap-2">
            <select
              value={classFilter}
              onChange={(event) =>
                setClassFilter(event.target.value as NyahAccountClassId | '')
              }
              className="input-field text-xs"
            >
              <option value="">{t('nyahAllClasses')}</option>
              {NYAH_ACCOUNT_CLASSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} — {t(item.nameKey)}
                </option>
              ))}
            </select>
            <input
              value={accountSearch}
              onChange={(event) => setAccountSearch(event.target.value)}
              placeholder={t('nyahSearchAccounts')}
              className="input-field min-w-[12rem] text-xs"
            />
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={syntheticOnly}
                onChange={(event) => setSyntheticOnly(event.target.checked)}
              />
              {t('nyahSyntheticOnly')}
            </label>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>{t('nyahColClass')}</th>
                  <th>{t('nyahColAccount')}</th>
                  <th>{t('nyahColName')}</th>
                  <th>{t('nyahColBalanceType')}</th>
                  <th>{t('nyahColForm3')}</th>
                  <th>{t('nyahColForm14')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.code}>
                    <td>{account.classId}</td>
                    <td className="font-mono font-semibold">{account.code}</td>
                    <td>
                      {resolveNyahAccountName(account, locale, t)}
                      {account.notes && (
                        <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                          {account.notes}
                        </span>
                      )}
                    </td>
                    <td>{t(`nyahBalance_${account.balanceType}`)}</td>
                    <td>{account.form3Row ?? '—'}</td>
                    <td>{account.form14Row ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {t('nyahAccountsCount', { count: NYAH_ACCOUNTS.length })}
          </p>
        </div>
      )}

      {tab === 'memorial' && (
        <FinanceMemorialOrdersPanel
          settings={settings}
          entries={entries}
          customOperations={customMemorialOperations}
          operationOverrides={memorialOperationOverrides}
          onCustomOperationsChange={setCustomMemorialOperations}
          onOperationOverridesChange={setMemorialOperationOverrides}
          onEntriesChange={setEntries}
          onPersist={persist}
          saving={saving}
        />
      )}

      {tab === 'journal' && (
        <div className="space-y-4 print:hidden">
          {canEdit && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/20 p-4">
              <p className="text-xs font-semibold">{t('nyahTemplateTitle')}</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="space-y-1 text-xs">
                  <span className="field-label">{t('nyahTemplateOperation')}</span>
                  <select
                    value={selectedTemplate}
                    onChange={(event) => setSelectedTemplate(event.target.value)}
                    className="input-field min-w-[14rem] text-xs"
                  >
                    {BUDGET_OPERATION_CATEGORIES.map((category) => {
                      const items = BUDGET_OPERATION_TEMPLATES.filter(
                        (item) => item.category === category.id
                      );
                      if (items.length === 0) return null;
                      return (
                        <optgroup key={category.id} label={t(category.labelKey)}>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {t(item.labelKey)} — {t(item.descriptionKey)}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  <span className="field-label">{t('nyahColAmount')}</span>
                  <input
                    value={templateAmount}
                    onChange={(event) => setTemplateAmount(event.target.value)}
                    className="input-field w-28 text-xs"
                  />
                </label>
                <button type="button" onClick={applyTemplate} className="btn-secondary text-xs">
                  {t('nyahApplyTemplate')}
                </button>
              </div>
            </div>
          )}

          {draft && canEdit && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-xs font-semibold">{t('nyahDraftEntry')}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1 text-xs">
                  <span className="field-label">{t('nyahColDate')}</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                    className="input-field w-full text-xs"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="field-label">{t('nyahColDocumentType')}</span>
                  <input
                    value={draft.documentType ?? ''}
                    onChange={(event) =>
                      setDraft({ ...draft, documentType: event.target.value })
                    }
                    className="input-field w-full text-xs"
                    list="nyah-document-types"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="field-label">{t('nyahColDocumentNumber')}</span>
                  <input
                    value={draft.documentNumber ?? ''}
                    onChange={(event) =>
                      setDraft({ ...draft, documentNumber: event.target.value })
                    }
                    className="input-field w-full text-xs"
                  />
                </label>
                <label className="space-y-1 text-xs lg:col-span-1">
                  <span className="field-label">{t('nyahColDescription')}</span>
                  <input
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    className="input-field w-full text-xs"
                  />
                </label>
              </div>
              <datalist id="nyah-document-types">
                {BUDGET_OPERATION_TEMPLATES.map((item) => (
                  <option key={item.id} value={t(item.documentTypeKey)} />
                ))}
              </datalist>
              <table className="data-table mt-3 text-xs">
                <thead>
                  <tr>
                    <th>{t('nyahColAccount')}</th>
                    <th className="text-right">{t('nyahColDebit')}</th>
                    <th className="text-right">{t('nyahColCredit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          value={line.accountCode}
                          onChange={(event) => {
                            const next = [...draft.lines];
                            next[index] = { ...line, accountCode: event.target.value };
                            setDraft({ ...draft, lines: next });
                          }}
                          className="input-field w-full font-mono text-xs"
                          list="nyah-account-codes"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.debit || ''}
                          onChange={(event) => {
                            const next = [...draft.lines];
                            next[index] = {
                              ...line,
                              debit: Number(event.target.value) || 0,
                              credit: 0,
                            };
                            setDraft({ ...draft, lines: next });
                          }}
                          className="input-field w-full text-right text-xs"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.credit || ''}
                          onChange={(event) => {
                            const next = [...draft.lines];
                            next[index] = {
                              ...line,
                              credit: Number(event.target.value) || 0,
                              debit: 0,
                            };
                            setDraft({ ...draft, lines: next });
                          }}
                          className="input-field w-full text-right text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="nyah-account-codes">
                {NYAH_ACCOUNTS.map((account) => (
                  <option key={account.code} value={account.code}>
                    {resolveNyahAccountName(account, locale, t)}
                  </option>
                ))}
              </datalist>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={saveDraft} className="btn-primary text-xs">
                  {t('nyahSaveEntry')}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>№</th>
                  <th>{t('nyahColDate')}</th>
                  <th>{t('nyahColDocument')}</th>
                  <th>{t('nyahColDescription')}</th>
                  <th>{t('nyahColDebitAccount')}</th>
                  <th>{t('nyahColCreditAccount')}</th>
                  <th className="text-right">{t('nyahColAmount')}</th>
                  {canEdit && <th />}
                </tr>
              </thead>
              <tbody>
                {memorialRows.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="text-center text-[var(--text-muted)]">
                      {t('nyahNoEntries')}
                    </td>
                  </tr>
                ) : (
                  memorialRows.map(({ entry, row, rowIndex, rowCount }) => (
                    <tr key={`${entry.id}-${rowIndex}`}>
                      {rowIndex === 0 && (
                        <>
                          <td rowSpan={rowCount}>{entry.entryNumber}</td>
                          <td rowSpan={rowCount}>{formatAppDate(entry.date, locale)}</td>
                          <td rowSpan={rowCount}>{formatEntryDocument(entry) || '—'}</td>
                          <td rowSpan={rowCount}>{entry.description}</td>
                        </>
                      )}
                      <td className="font-mono text-[10px]">
                        {row.debitAccount}
                        <span className="mt-0.5 block font-sans text-[var(--text-muted)]">
                          {accountLabel(row.debitAccount)}
                        </span>
                      </td>
                      <td className="font-mono text-[10px]">
                        {row.creditAccount}
                        <span className="mt-0.5 block font-sans text-[var(--text-muted)]">
                          {accountLabel(row.creditAccount)}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        {formatJournalAmount(row.amount)}
                      </td>
                      {canEdit && rowIndex === 0 && (
                        <td rowSpan={rowCount}>
                          <button
                            type="button"
                            onClick={() => deleteEntry(entry.id)}
                            className="text-red-400 hover:underline"
                          >
                            {t('sickLeaveDelete')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'turnover' && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] print:hidden">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>{t('nyahColAccount')}</th>
                <th>{t('nyahColName')}</th>
                <th className="text-right">{t('nyahColDebit')}</th>
                <th className="text-right">{t('nyahColCredit')}</th>
                <th className="text-right">{t('nyahColBalance')}</th>
              </tr>
            </thead>
            <tbody>
              {turnover.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-[var(--text-muted)]">
                    {t('nyahNoTurnover')}
                  </td>
                </tr>
              ) : (
                turnover.map((row) => {
                  const account = findNyahAccount(row.accountCode);
                  return (
                    <tr key={row.accountCode}>
                      <td className="font-mono">{row.accountCode}</td>
                      <td>{account ? resolveNyahAccountName(account, locale, t) : '—'}</td>
                      <td className="text-right tabular-nums">
                        {formatJournalAmount(row.debitTurnover)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatJournalAmount(row.creditTurnover)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatJournalAmount(row.balance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {yearEntries.length > 0 && (
        <article
          id="finance-budget-accounting-document"
          className="rounded-xl border border-[var(--border)] bg-white/5 p-5 md:p-6"
        >
          <OrganizationReportDocumentHeader />
          <div className="py-4 text-center">
            <h6 className="text-base font-bold uppercase tracking-wide md:text-lg">
              {t('nyahDocumentTitle')}
            </h6>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {reportOrganizationName || organization?.name}
            </p>
            <p className="mt-2 text-xs">
              {t('nyahFiscalYear')}: <span className="font-semibold">{settings.fiscalYear}</span>
            </p>
          </div>

          <div className="table-wrapper table-scroll-sm">
            <table>
              <thead>
                <tr>
                  <th>№</th>
                  <th>{t('nyahColDate')}</th>
                  <th>{t('nyahColDocument')}</th>
                  <th>{t('nyahColDescription')}</th>
                  <th>{t('nyahColDebitAccount')}</th>
                  <th>{t('nyahColCreditAccount')}</th>
                  <th className="text-right">{t('nyahColAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {memorialRows.map(({ entry, row, rowIndex, rowCount }) => (
                    <tr key={`${entry.id}-print-${rowIndex}`}>
                      {rowIndex === 0 && (
                        <>
                          <td rowSpan={rowCount}>{entry.entryNumber}</td>
                          <td rowSpan={rowCount}>{formatAppDate(entry.date, locale)}</td>
                          <td rowSpan={rowCount}>{formatEntryDocument(entry) || '—'}</td>
                          <td rowSpan={rowCount}>{entry.description}</td>
                        </>
                      )}
                      <td className="font-mono">{row.debitAccount}</td>
                      <td className="font-mono">{row.creditAccount}</td>
                      <td className="text-right tabular-nums">
                        {formatJournalAmount(row.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
            {t('nyahDocumentNote')}
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
