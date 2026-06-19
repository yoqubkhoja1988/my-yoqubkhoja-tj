'use client';

import {
  formatJournalAmount,
  nextJournalEntryNumber,
  upsertBudgetJournalEntry,
  validateJournalEntry,
} from '@/lib/budget-accounting-journal';
import {
  MEMORIAL_ORDERS_CATALOG,
  MemorialOrderDefinition,
  MemorialOrderOperation,
  MemorialOrderOperationOverride,
  memorialOrderFullTitle,
  memorialOrderLabel,
  resolveMemorialOperation,
} from '@/lib/memorial-orders-catalog';
import { findNyahAccount, NYAH_ACCOUNTS, resolveNyahAccountName } from '@/lib/budget-unified-chart-of-accounts';
import { parseAmount } from '@/lib/staff-table-calc';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import {
  BudgetAccountingJournalEntry,
  BudgetAccountingSettings,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  settings: BudgetAccountingSettings;
  entries: BudgetAccountingJournalEntry[];
  customOperations: Record<string, MemorialOrderOperation[]>;
  operationOverrides: Record<string, MemorialOrderOperationOverride>;
  onCustomOperationsChange: (next: Record<string, MemorialOrderOperation[]>) => void;
  onOperationOverridesChange: (next: Record<string, MemorialOrderOperationOverride>) => void;
  onEntriesChange: (next: BudgetAccountingJournalEntry[]) => void;
  onPersist: (
    settings: BudgetAccountingSettings,
    entries: BudgetAccountingJournalEntry[],
    customOps: Record<string, MemorialOrderOperation[]>,
    operationOverrides: Record<string, MemorialOrderOperationOverride>
  ) => Promise<void>;
  saving: boolean;
};

type RowDraft = {
  amount: string;
  basis: string;
  date: string;
};

function defaultDate(settings: BudgetAccountingSettings): string {
  return `${settings.fiscalYear}-01-31`;
}

function isCustomOperation(operationId: string): boolean {
  return operationId.includes('-custom-');
}

function operationsForOrder(
  order: MemorialOrderDefinition,
  customOperations: Record<string, MemorialOrderOperation[]>,
  operationOverrides: Record<string, MemorialOrderOperationOverride>
): MemorialOrderOperation[] {
  return [
    ...order.operations.map((operation) =>
      resolveMemorialOperation(operation, operationOverrides)
    ),
    ...(customOperations[order.id] ?? []),
  ];
}

function findMemorialEntry(
  entries: BudgetAccountingJournalEntry[],
  orderId: string,
  operationId: string
): BudgetAccountingJournalEntry | undefined {
  return entries.find(
    (entry) =>
      entry.memorialOrderId === orderId &&
      entry.memorialOperationId === operationId &&
      !entry.sourcePayrollMonth &&
      !entry.sourceSocialInsuranceMonth
  );
}

export default function FinanceMemorialOrdersPanel({
  settings,
  entries,
  customOperations,
  operationOverrides,
  onCustomOperationsChange,
  onOperationOverridesChange,
  onEntriesChange,
  onPersist,
  saving,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { canEdit } = useOrganizationAccess();
  const [selectedOrderId, setSelectedOrderId] = useState(MEMORIAL_ORDERS_CATALOG[0]?.id ?? '');
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});
  const [error, setError] = useState('');
  const memorialMetaPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (memorialMetaPersistTimer.current) clearTimeout(memorialMetaPersistTimer.current);
    };
  }, []);

  function scheduleMemorialMetaPersist(
    nextCustomOps: Record<string, MemorialOrderOperation[]>,
    nextOverrides: Record<string, MemorialOrderOperationOverride>
  ) {
    if (memorialMetaPersistTimer.current) clearTimeout(memorialMetaPersistTimer.current);
    memorialMetaPersistTimer.current = setTimeout(() => {
      void onPersist(settings, entries, nextCustomOps, nextOverrides);
    }, 800);
  }

  const selectedOrder = useMemo(
    () => MEMORIAL_ORDERS_CATALOG.find((order) => order.id === selectedOrderId),
    [selectedOrderId]
  );

  const operations = useMemo(
    () =>
      selectedOrder
        ? operationsForOrder(selectedOrder, customOperations, operationOverrides)
        : [],
    [selectedOrder, customOperations, operationOverrides]
  );

  function accountLabel(code: string): string {
    const account = findNyahAccount(code);
    return account ? resolveNyahAccountName(account, locale, t) : code;
  }

  function rowDraft(operationId: string): RowDraft {
    if (rowDrafts[operationId]) return rowDrafts[operationId];
    const existing =
      selectedOrder &&
      findMemorialEntry(entries, selectedOrder.id, operationId);
    const amount =
      existing?.lines.find((line) => line.debit > 0)?.debit ??
      existing?.lines.find((line) => line.credit > 0)?.credit ??
      0;
    return {
      amount: amount > 0 ? formatJournalAmount(amount) : '',
      basis: existing?.basisDocument ?? '',
      date: existing?.date ?? defaultDate(settings),
    };
  }

  function updateRowDraft(operationId: string, patch: Partial<RowDraft>) {
    setRowDrafts((current) => ({
      ...current,
      [operationId]: { ...rowDraft(operationId), ...patch },
    }));
  }

  function updateOperationField(
    operationId: string,
    patch: Partial<MemorialOrderOperation>
  ) {
    if (!selectedOrder || !canEdit) return;

    if (isCustomOperation(operationId)) {
      const custom = customOperations[selectedOrder.id] ?? [];
      const nextCustomOps = {
        ...customOperations,
        [selectedOrder.id]: custom.map((item) =>
          item.id === operationId ? { ...item, ...patch } : item
        ),
      };
      onCustomOperationsChange(nextCustomOps);
      scheduleMemorialMetaPersist(nextCustomOps, operationOverrides);
      return;
    }

    const nextOverrides = {
      ...operationOverrides,
      [operationId]: { ...(operationOverrides[operationId] ?? {}), ...patch },
    };
    onOperationOverridesChange(nextOverrides);
    scheduleMemorialMetaPersist(customOperations, nextOverrides);
  }

  async function saveOperation(operation: MemorialOrderOperation) {
    if (!selectedOrder || !canEdit) return;
    setError('');
    const draft = rowDraft(operation.id);
    const amount = parseAmount(draft.amount) ?? 0;
    if (amount <= 0) {
      setError(t('nyahMoAmountRequired'));
      return;
    }

    const existing = findMemorialEntry(entries, selectedOrder.id, operation.id);
    const entry: BudgetAccountingJournalEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      entryNumber: existing?.entryNumber ?? nextJournalEntryNumber(settings, entries),
      date: draft.date,
      description: operation.name,
      documentType: t('nyahDocMemorialOrder'),
      documentNumber: memorialOrderLabel(selectedOrder),
      memorialOrderId: selectedOrder.id,
      memorialOperationId: operation.id,
      basisDocument: draft.basis.trim() || operation.basisHint || undefined,
      lines: [
        { accountCode: operation.debitAccount, debit: amount, credit: 0 },
        { accountCode: operation.creditAccount, debit: 0, credit: amount },
      ],
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    const validationError = validateJournalEntry(entry);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    const nextEntries = upsertBudgetJournalEntry(entries, entry);
    onEntriesChange(nextEntries);
    await onPersist(settings, nextEntries, customOperations, operationOverrides);
  }

  async function removeOperationEntry(operation: MemorialOrderOperation) {
    if (!selectedOrder || !canEdit) return;
    const existing = findMemorialEntry(entries, selectedOrder.id, operation.id);
    if (!existing) return;
    const nextEntries = entries.filter((entry) => entry.id !== existing.id);
    onEntriesChange(nextEntries);
    setRowDrafts((current) => {
      const next = { ...current };
      delete next[operation.id];
      return next;
    });
    await onPersist(settings, nextEntries, customOperations, operationOverrides);
  }

  function addCustomOperation() {
    if (!selectedOrder || !canEdit) return;
    const custom = customOperations[selectedOrder.id] ?? [];
    const nextOp: MemorialOrderOperation = {
      id: `${selectedOrder.id}-custom-${custom.length + 1}`,
      name: t('nyahMoCustomOperation'),
      debitAccount: '',
      creditAccount: '',
      basisHint: null,
    };
    const nextCustomOps = {
      ...customOperations,
      [selectedOrder.id]: [...custom, nextOp],
    };
    onCustomOperationsChange(nextCustomOps);
    void onPersist(settings, entries, nextCustomOps, operationOverrides);
  }

  function removeCustomOperation(operationId: string) {
    if (!selectedOrder || !canEdit || !isCustomOperation(operationId)) return;
    const custom = customOperations[selectedOrder.id] ?? [];
    const nextCustomOps = {
      ...customOperations,
      [selectedOrder.id]: custom.filter((item) => item.id !== operationId),
    };
    onCustomOperationsChange(nextCustomOps);
    setRowDrafts((current) => {
      const next = { ...current };
      delete next[operationId];
      return next;
    });
    void onPersist(settings, entries, nextCustomOps, operationOverrides);
  }

  if (!selectedOrder) {
    return null;
  }

  const orderEntries = entries.filter((entry) => entry.memorialOrderId === selectedOrder.id);

  return (
    <div className="space-y-4 print:hidden">
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('nyahMoIntro')}</p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="field-label">{t('nyahMoSelectOrder')}</span>
          <select
            value={selectedOrderId}
            onChange={(event) => {
              setSelectedOrderId(event.target.value);
              setRowDrafts({});
              setError('');
            }}
            className="input-field min-w-[18rem] text-xs"
          >
            {MEMORIAL_ORDERS_CATALOG.map((order) => (
              <option key={order.id} value={order.id}>
                {memorialOrderFullTitle(order)} ({order.operations.length})
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-[var(--text-muted)]">
          {t('nyahMoEntriesCount', { count: orderEntries.length })}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {operations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
          <p>{t('nyahMoEmptyOrder')}</p>
          {canEdit && (
            <button type="button" onClick={addCustomOperation} className="btn-secondary mt-3 text-xs">
              + {t('nyahMoAddCustomRow')}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="data-table min-w-[56rem] text-xs">
            <thead>
              <tr>
                <th>{t('nyahMoColOperation')}</th>
                <th>{t('nyahColDebitAccount')}</th>
                <th>{t('nyahColCreditAccount')}</th>
                <th>{t('nyahColDate')}</th>
                <th className="text-right">{t('nyahColAmount')}</th>
                <th>{t('nyahMoColBasis')}</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => {
                const draft = rowDraft(operation.id);
                const isCustom = isCustomOperation(operation.id);
                const saved = findMemorialEntry(entries, selectedOrder.id, operation.id);
                return (
                  <tr key={operation.id}>
                    <td className="min-w-[12rem]">
                      {canEdit ? (
                        <input
                          value={operation.name}
                          onChange={(event) =>
                            updateOperationField(operation.id, { name: event.target.value })
                          }
                          className="input-field w-full text-xs"
                        />
                      ) : (
                        operation.name
                      )}
                    </td>
                    <td className="font-mono text-[10px]">
                      {canEdit ? (
                        <>
                          <input
                            value={operation.debitAccount}
                            onChange={(event) =>
                              updateOperationField(operation.id, {
                                debitAccount: event.target.value,
                              })
                            }
                            className="input-field w-full font-mono text-xs"
                            list="nyah-mo-account-codes"
                          />
                          {operation.debitAccount && (
                            <span className="mt-0.5 block font-sans text-[var(--text-muted)]">
                              {accountLabel(operation.debitAccount)}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {operation.debitAccount}
                          <span className="mt-0.5 block font-sans text-[var(--text-muted)]">
                            {accountLabel(operation.debitAccount)}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="font-mono text-[10px]">
                      {canEdit ? (
                        <>
                          <input
                            value={operation.creditAccount}
                            onChange={(event) =>
                              updateOperationField(operation.id, {
                                creditAccount: event.target.value,
                              })
                            }
                            className="input-field w-full font-mono text-xs"
                            list="nyah-mo-account-codes"
                          />
                          {operation.creditAccount && (
                            <span className="mt-0.5 block font-sans text-[var(--text-muted)]">
                              {accountLabel(operation.creditAccount)}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {operation.creditAccount}
                          <span className="mt-0.5 block font-sans text-[var(--text-muted)]">
                            {accountLabel(operation.creditAccount)}
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(event) =>
                            updateRowDraft(operation.id, { date: event.target.value })
                          }
                          className="input-field text-xs"
                        />
                      ) : (
                        draft.date
                      )}
                    </td>
                    <td className="text-right">
                      {canEdit ? (
                        <input
                          value={draft.amount}
                          onChange={(event) =>
                            updateRowDraft(operation.id, { amount: event.target.value })
                          }
                          placeholder="0,00"
                          className="input-field w-28 text-right text-xs"
                        />
                      ) : (
                        draft.amount || '—'
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          value={draft.basis}
                          onChange={(event) =>
                            updateRowDraft(operation.id, { basis: event.target.value })
                          }
                          placeholder={operation.basisHint ?? ''}
                          className="input-field min-w-[10rem] text-xs"
                        />
                      ) : (
                        draft.basis || operation.basisHint || '—'
                      )}
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void saveOperation(operation)}
                          className="text-[var(--accent)] hover:underline"
                          disabled={saving}
                        >
                          {saved ? t('nyahMoUpdate') : t('save')}
                        </button>
                        {saved && (
                          <>
                            {' · '}
                            <button
                              type="button"
                              onClick={() => void removeOperationEntry(operation)}
                              className="text-red-400 hover:underline"
                              disabled={saving}
                            >
                              {t('sickLeaveDelete')}
                            </button>
                          </>
                        )}
                        {isCustom && !saved && (
                          <>
                            {' · '}
                            <button
                              type="button"
                              onClick={() => removeCustomOperation(operation.id)}
                              className="text-red-400 hover:underline"
                              disabled={saving}
                            >
                              {t('sickLeaveDelete')}
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && operations.length > 0 && (
        <button type="button" onClick={addCustomOperation} className="btn-secondary text-xs">
          + {t('nyahMoAddCustomRow')}
        </button>
      )}

      <datalist id="nyah-mo-account-codes">
        {NYAH_ACCOUNTS.map((account) => (
          <option key={account.code} value={account.code}>
            {resolveNyahAccountName(account, locale, t)}
          </option>
        ))}
      </datalist>
    </div>
  );
}
