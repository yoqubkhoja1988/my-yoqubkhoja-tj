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
  hiddenOperations: Record<string, string[]>;
  onCustomOperationsChange: (next: Record<string, MemorialOrderOperation[]>) => void;
  onOperationOverridesChange: (next: Record<string, MemorialOrderOperationOverride>) => void;
  onHiddenOperationsChange: (next: Record<string, string[]>) => void;
  onEntriesChange: (next: BudgetAccountingJournalEntry[]) => void;
  onPersist: (
    settings: BudgetAccountingSettings,
    entries: BudgetAccountingJournalEntry[],
    customOps: Record<string, MemorialOrderOperation[]>,
    operationOverrides: Record<string, MemorialOrderOperationOverride>,
    hiddenOps: Record<string, string[]>
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
  operationOverrides: Record<string, MemorialOrderOperationOverride>,
  hiddenOperations: Record<string, string[]>
): MemorialOrderOperation[] {
  const hidden = new Set(hiddenOperations[order.id] ?? []);
  return [
    ...order.operations
      .filter((operation) => !hidden.has(operation.id))
      .map((operation) => resolveMemorialOperation(operation, operationOverrides)),
    ...(customOperations[order.id] ?? []),
  ];
}

function hiddenTemplateOperations(
  order: MemorialOrderDefinition,
  hiddenOperations: Record<string, string[]>,
  operationOverrides: Record<string, MemorialOrderOperationOverride>
): MemorialOrderOperation[] {
  const hidden = hiddenOperations[order.id] ?? [];
  return hidden
    .map((operationId) => order.operations.find((operation) => operation.id === operationId))
    .filter((operation): operation is MemorialOrderOperation => Boolean(operation))
    .map((operation) => resolveMemorialOperation(operation, operationOverrides));
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
  hiddenOperations,
  onCustomOperationsChange,
  onOperationOverridesChange,
  onHiddenOperationsChange,
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

  const selectedOrder = useMemo(
    () => MEMORIAL_ORDERS_CATALOG.find((order) => order.id === selectedOrderId),
    [selectedOrderId]
  );

  const operations = useMemo(
    () =>
      selectedOrder
        ? operationsForOrder(
            selectedOrder,
            customOperations,
            operationOverrides,
            hiddenOperations
          )
        : [],
    [selectedOrder, customOperations, operationOverrides, hiddenOperations]
  );

  const hiddenRows = useMemo(
    () =>
      selectedOrder
        ? hiddenTemplateOperations(selectedOrder, hiddenOperations, operationOverrides)
        : [],
    [selectedOrder, hiddenOperations, operationOverrides]
  );

  function scheduleMemorialMetaPersist(
    nextCustomOps: Record<string, MemorialOrderOperation[]>,
    nextOverrides: Record<string, MemorialOrderOperationOverride>,
    nextHiddenOps: Record<string, string[]> = hiddenOperations
  ) {
    if (memorialMetaPersistTimer.current) clearTimeout(memorialMetaPersistTimer.current);
    memorialMetaPersistTimer.current = setTimeout(() => {
      void onPersist(settings, entries, nextCustomOps, nextOverrides, nextHiddenOps);
    }, 800);
  }

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

  function renderAccountCell(
    operation: MemorialOrderOperation,
    side: 'debit' | 'credit'
  ) {
    const code = side === 'debit' ? operation.debitAccount : operation.creditAccount;
    const field = side === 'debit' ? 'debitAccount' : 'creditAccount';

    if (canEdit) {
      return (
        <>
          <input
            value={code}
            onChange={(event) =>
              updateOperationField(operation.id, { [field]: event.target.value })
            }
            className="input-field w-full min-w-[6.75rem] font-mono text-[10px] whitespace-nowrap px-1.5"
            list="nyah-mo-account-codes"
          />
          {code && (
            <span className="mt-0.5 block break-words font-sans text-[9px] leading-tight text-[var(--text-muted)]">
              {accountLabel(code)}
            </span>
          )}
        </>
      );
    }

    return (
      <>
        <span className="whitespace-nowrap">{code || '—'}</span>
        {code && (
          <span className="mt-0.5 block break-words font-sans text-[9px] leading-tight text-[var(--text-muted)]">
            {accountLabel(code)}
          </span>
        )}
      </>
    );
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
    await onPersist(
      settings,
      nextEntries,
      customOperations,
      operationOverrides,
      hiddenOperations
    );
  }

  async function removeRow(operation: MemorialOrderOperation) {
    if (!selectedOrder || !canEdit) return;

    const existing = findMemorialEntry(entries, selectedOrder.id, operation.id);
    const nextEntries = existing
      ? entries.filter((entry) => entry.id !== existing.id)
      : entries;

    let nextCustomOps = customOperations;
    let nextHiddenOps = hiddenOperations;

    if (isCustomOperation(operation.id)) {
      const custom = customOperations[selectedOrder.id] ?? [];
      nextCustomOps = {
        ...customOperations,
        [selectedOrder.id]: custom.filter((item) => item.id !== operation.id),
      };
      onCustomOperationsChange(nextCustomOps);
    } else {
      const hidden = hiddenOperations[selectedOrder.id] ?? [];
      if (!hidden.includes(operation.id)) {
        nextHiddenOps = {
          ...hiddenOperations,
          [selectedOrder.id]: [...hidden, operation.id],
        };
        onHiddenOperationsChange(nextHiddenOps);
      }
    }

    if (existing) {
      onEntriesChange(nextEntries);
    }

    setRowDrafts((current) => {
      const next = { ...current };
      delete next[operation.id];
      return next;
    });

    await onPersist(
      settings,
      nextEntries,
      nextCustomOps,
      operationOverrides,
      nextHiddenOps
    );
  }

  async function restoreHiddenRow(operation: MemorialOrderOperation) {
    if (!selectedOrder || !canEdit) return;
    const hidden = hiddenOperations[selectedOrder.id] ?? [];
    const nextHiddenOps = {
      ...hiddenOperations,
      [selectedOrder.id]: hidden.filter((id) => id !== operation.id),
    };
    onHiddenOperationsChange(nextHiddenOps);
    await onPersist(
      settings,
      entries,
      customOperations,
      operationOverrides,
      nextHiddenOps
    );
  }

  function addCustomOperation() {
    if (!selectedOrder || !canEdit) return;
    const custom = customOperations[selectedOrder.id] ?? [];
    const nextOp: MemorialOrderOperation = {
      id: `${selectedOrder.id}-custom-${Date.now()}`,
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
    void onPersist(
      settings,
      entries,
      nextCustomOps,
      operationOverrides,
      hiddenOperations
    );
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
            {MEMORIAL_ORDERS_CATALOG.map((order) => {
              const hidden = hiddenOperations[order.id]?.length ?? 0;
              const custom = customOperations[order.id]?.length ?? 0;
              const visible = order.operations.length - hidden + custom;
              return (
                <option key={order.id} value={order.id}>
                  {memorialOrderFullTitle(order)} ({visible})
                </option>
              );
            })}
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
          <table className="data-table w-full table-auto text-xs">
            <thead>
              <tr>
                <th className="w-[28%] min-w-[12rem]">{t('nyahMoColOperation')}</th>
                <th className="w-[11%] min-w-[6.75rem]">{t('nyahColDebitAccount')}</th>
                <th className="w-[11%] min-w-[6.75rem]">{t('nyahColCreditAccount')}</th>
                <th className="w-[10%] min-w-[8.25rem]">{t('nyahColDate')}</th>
                <th className="w-[10%] min-w-[5.75rem] text-right">{t('nyahColAmount')}</th>
                <th>{t('nyahMoColBasis')}</th>
                {canEdit && <th className="w-[9%] min-w-[9rem]" />}
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => {
                const draft = rowDraft(operation.id);
                const saved = findMemorialEntry(entries, selectedOrder.id, operation.id);
                return (
                  <tr
                    key={operation.id}
                    className={saved ? 'bg-[var(--accent)]/5' : undefined}
                  >
                    <td className="min-w-[12rem] align-top">
                      {canEdit ? (
                        <input
                          value={operation.name}
                          onChange={(event) =>
                            updateOperationField(operation.id, { name: event.target.value })
                          }
                          className="input-field w-full text-xs"
                        />
                      ) : (
                        <span className="block leading-snug">{operation.name}</span>
                      )}
                    </td>
                    <td className="min-w-[6.75rem] align-top font-mono text-[10px]">
                      {renderAccountCell(operation, 'debit')}
                    </td>
                    <td className="min-w-[6.75rem] align-top font-mono text-[10px]">
                      {renderAccountCell(operation, 'credit')}
                    </td>
                    <td className="w-[8.25rem] align-top">
                      {canEdit ? (
                        <input
                          type="date"
                          value={draft.date}
                          onChange={(event) =>
                            updateRowDraft(operation.id, { date: event.target.value })
                          }
                          className="input-field w-full min-w-0 text-xs px-1.5"
                        />
                      ) : (
                        draft.date
                      )}
                    </td>
                    <td className="min-w-[5.75rem] align-top text-right">
                      {canEdit ? (
                        <input
                          value={draft.amount}
                          onChange={(event) =>
                            updateRowDraft(operation.id, { amount: event.target.value })
                          }
                          placeholder="0,00"
                          className="input-field w-full min-w-[5.75rem] text-right text-xs px-1.5"
                        />
                      ) : (
                        draft.amount || '—'
                      )}
                    </td>
                    <td className="align-top">
                      {canEdit ? (
                        <input
                          value={draft.basis}
                          onChange={(event) =>
                            updateRowDraft(operation.id, { basis: event.target.value })
                          }
                          placeholder={operation.basisHint ?? ''}
                          className="input-field w-full min-w-0 text-xs"
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
                        {' · '}
                        <button
                          type="button"
                          onClick={() => void removeRow(operation)}
                          className="text-red-400 hover:underline"
                          disabled={saving}
                        >
                          {t('sickLeaveDelete')}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <button type="button" onClick={addCustomOperation} className="btn-secondary text-xs">
          + {t('nyahMoAddCustomRow')}
        </button>
      )}

      {hiddenRows.length > 0 && (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-3 text-xs">
          <p className="mb-2 font-medium text-[var(--text-muted)]">{t('nyahMoHiddenRows')}</p>
          <ul className="space-y-1">
            {hiddenRows.map((operation) => (
              <li key={operation.id} className="flex flex-wrap items-center gap-2">
                <span>{operation.name}</span>
                <span className="text-[var(--text-muted)]">
                  {operation.debitAccount} → {operation.creditAccount}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void restoreHiddenRow(operation)}
                    className="text-[var(--accent)] hover:underline"
                    disabled={saving}
                  >
                    {t('nyahMoRestoreRow')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
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
