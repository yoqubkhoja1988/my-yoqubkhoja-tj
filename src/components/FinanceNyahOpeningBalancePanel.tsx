'use client';

import {
  resolveBudgetAccountingSettings,
  supportsBudgetAccounting,
} from '@/lib/budget-accounting-settings';
import {
  formatOpeningBalanceAmount,
  addOpeningBalanceAccount,
  openingBalanceRows,
  parseOpeningBalanceAmount,
  removeOpeningBalance,
  summarizeOpeningBalances,
  upsertOpeningBalance,
} from '@/lib/budget-opening-balances';
import {
  NYAH_ACCOUNT_CLASSES,
  NYAH_INSTRUCTION,
  NyahAccountClassId,
  isSyntheticNyahAccount,
  resolveNyahAccountName,
  searchNyahAccounts,
} from '@/lib/budget-unified-chart-of-accounts';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
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
  onUpdate: (content: OrganizationSectionContent) => void;
};

export default function FinanceNyahOpeningBalancePanel({
  organizationId,
  financeContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const { canEdit } = useOrganizationAccess();
  const [settings, setSettings] = useState<BudgetAccountingSettings>(() =>
    resolveBudgetAccountingSettings(financeContent)
  );
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<NyahAccountClassId | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(resolveBudgetAccountingSettings(financeContent));
  }, [financeContent.budgetAccountingSettings]);

  const rows = useMemo(() => openingBalanceRows(settings), [settings]);
  const summary = useMemo(() => summarizeOpeningBalances(rows), [rows]);

  const searchResults = useMemo(() => {
    const existing = new Set(rows.map((row) => row.accountCode));
    return searchNyahAccounts(query)
      .filter((account) => !classFilter || account.classId === classFilter)
      .filter((account) => !existing.has(account.code))
      .slice(0, 12);
  }, [query, classFilter, rows]);

  async function persist(nextSettings: BudgetAccountingSettings) {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      budgetAccountingSettings: nextSettings,
    };

    try {
      const savedContent = await updateOrganizationSection(organizationId, 'finance', payload);
      if (!savedContent) {
        setError(t('sectionSaveError'));
        return;
      }
      const resolved = resolveBudgetAccountingSettings(savedContent);
      onUpdate({
        ...savedContent,
        budgetAccountingSettings: resolved,
      });
      setSettings(resolved);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(t('sectionSaveError'));
    } finally {
      setSaving(false);
    }
  }

  function patchSettings(next: BudgetAccountingSettings) {
    setSettings(next);
  }

  function handleAmountChange(
    accountCode: string,
    side: 'debit' | 'credit',
    rawValue: string
  ) {
    const amount = parseOpeningBalanceAmount(rawValue);
    patchSettings({
      ...settings,
      openingBalances: upsertOpeningBalance(settings.openingBalances ?? {}, accountCode, {
        debit: side === 'debit' ? amount : 0,
        credit: side === 'credit' ? amount : 0,
      }),
    });
  }

  function handleAddAccount(accountCode: string) {
    patchSettings({
      ...settings,
      openingBalances: addOpeningBalanceAccount(settings.openingBalances ?? {}, accountCode),
    });
    setQuery('');
  }

  function handleRemoveAccount(accountCode: string) {
    patchSettings({
      ...settings,
      openingBalances: removeOpeningBalance(settings.openingBalances ?? {}, accountCode),
    });
  }

  if (!supportsBudgetAccounting(organizationId)) {
    return null;
  }

  return (
    <section id="finance-nyah-opening-balances" className="space-y-4">
      <div>
        <p className="page-eyebrow">{t('financeNavNyahOpeningBalances')}</p>
        <h2 className="text-lg font-semibold">{t('nyahOpeningTitle')}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          {t('nyahOpeningSubtitle')}
        </p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {t('nyahInstructionRef', {
            number: NYAH_INSTRUCTION.number,
            date: NYAH_INSTRUCTION.date,
            issuer: NYAH_INSTRUCTION.issuer,
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4">
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('nyahFiscalYear')}</span>
          <input
            type="text"
            value={settings.fiscalYear}
            onChange={(event) =>
              patchSettings({ ...settings, fiscalYear: event.target.value.trim() })
            }
            disabled={!canEdit}
            className="input-field w-28 text-xs"
          />
        </label>
        {canEdit && (
          <button
            type="button"
            onClick={() => persist(settings)}
            className="btn-primary text-xs"
            disabled={saving}
          >
            {saving ? '...' : t('save')}
          </button>
        )}
        {saved && <span className="text-xs font-medium text-emerald-600">{t('adsinSaved')}</span>}
      </div>

      {canEdit && (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/10 p-4">
          <p className="text-xs font-semibold">{t('nyahOpeningAddAccount')}</p>
          <div className="flex flex-wrap gap-3">
            <label className="min-w-[12rem] flex-1 space-y-1 text-xs">
              <span className="field-label">{t('nyahSearchAccounts')}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input-field text-xs"
                placeholder={t('nyahOpeningSearchPlaceholder')}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="field-label">{t('nyahColClass')}</span>
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
            </label>
          </div>
          {searchResults.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchResults.map((account) => (
                <button
                  key={account.code}
                  type="button"
                  onClick={() => handleAddAccount(account.code)}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-left text-xs hover:border-[var(--accent)]"
                >
                  <span className="font-mono">{account.code}</span>
                  <span className="mx-1 text-[var(--text-muted)]">—</span>
                  <span>{resolveNyahAccountName(account, undefined, t)}</span>
                  {isSyntheticNyahAccount(account.code) && (
                    <span className="ml-1 text-[var(--text-muted)]">({t('nyahSyntheticOnly')})</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {!summary.balanced && summary.rowCount > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900">
          {t('nyahOpeningUnbalanced', {
            debit: formatOpeningBalanceAmount(summary.totalDebit),
            credit: formatOpeningBalanceAmount(summary.totalCredit),
            difference: formatOpeningBalanceAmount(summary.difference),
          })}
        </div>
      )}

      {summary.balanced && summary.rowCount > 0 && (
        <p className="text-xs font-medium text-emerald-600">{t('nyahOpeningBalanced')}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="data-table min-w-[44rem] text-xs">
          <thead>
            <tr>
              <th>{t('nyahColAccount')}</th>
              <th>{t('nyahColName')}</th>
              <th className="text-right">{t('financeReportForm1ColOpeningDebit')}</th>
              <th className="text-right">{t('financeReportForm1ColOpeningCredit')}</th>
              {canEdit && <th className="w-20" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="text-center text-[var(--text-muted)]">
                  {t('nyahOpeningEmpty')}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.accountCode}>
                  <td className="font-mono">{row.accountCode}</td>
                  <td>{row.accountName}</td>
                  <td className="text-right tabular-nums">
                    {canEdit ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.debit > 0 ? formatOpeningBalanceAmount(row.debit) : ''}
                        onChange={(event) =>
                          handleAmountChange(row.accountCode, 'debit', event.target.value)
                        }
                        className="input-field w-28 text-right text-xs tabular-nums"
                        placeholder="0,00"
                      />
                    ) : (
                      row.debit > 0 ? formatOpeningBalanceAmount(row.debit) : '—'
                    )}
                  </td>
                  <td className="text-right tabular-nums">
                    {canEdit ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.credit > 0 ? formatOpeningBalanceAmount(row.credit) : ''}
                        onChange={(event) =>
                          handleAmountChange(row.accountCode, 'credit', event.target.value)
                        }
                        className="input-field w-28 text-right text-xs tabular-nums"
                        placeholder="0,00"
                      />
                    ) : (
                      row.credit > 0 ? formatOpeningBalanceAmount(row.credit) : '—'
                    )}
                  </td>
                  {canEdit && (
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveAccount(row.accountCode)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        {t('delete')}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--bg-input)]/40 font-semibold">
                <td colSpan={2}>{t('nyahOpeningTotals')}</td>
                <td className="text-right tabular-nums">
                  {formatOpeningBalanceAmount(summary.totalDebit)}
                </td>
                <td className="text-right tabular-nums">
                  {formatOpeningBalanceAmount(summary.totalCredit)}
                </td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
