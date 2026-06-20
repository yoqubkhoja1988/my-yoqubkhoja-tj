'use client';

import FinanceMemorialOrdersPanel from '@/components/FinanceMemorialOrdersPanel';
import {
  resolveBudgetAccountingSettings,
  supportsBudgetAccounting,
} from '@/lib/budget-accounting-settings';
import { updateOrganizationSection } from '@/lib/organization-sections';
import {
  MemorialOrderOperation,
  MemorialOrderOperationOverride,
} from '@/lib/memorial-orders-catalog';
import { NYAH_INSTRUCTION } from '@/lib/budget-unified-chart-of-accounts';
import { Organization } from '@/types/organization';
import {
  BudgetAccountingJournalEntry,
  BudgetAccountingSettings,
  OrganizationSectionContent,
} from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  financeContent: OrganizationSectionContent;
  onUpdate: (content: OrganizationSectionContent) => void;
};

export default function FinanceNyahMemorialOrdersPanel({
  organizationId,
  financeContent,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const [settings, setSettings] = useState<BudgetAccountingSettings>(() =>
    resolveBudgetAccountingSettings(financeContent)
  );
  const [entries, setEntries] = useState<BudgetAccountingJournalEntry[]>(
    () => financeContent.budgetAccountingJournal ?? []
  );
  const [customOperations, setCustomOperations] = useState<
    Record<string, MemorialOrderOperation[]>
  >(() => financeContent.memorialOrderCustomOperations ?? {});
  const [operationOverrides, setOperationOverrides] = useState<
    Record<string, MemorialOrderOperationOverride>
  >(() => financeContent.memorialOrderOperationOverrides ?? {});
  const [hiddenOperations, setHiddenOperations] = useState<Record<string, string[]>>(
    () => financeContent.memorialOrderHiddenOperations ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSettings(resolveBudgetAccountingSettings(financeContent));
    setEntries(financeContent.budgetAccountingJournal ?? []);
    setCustomOperations(financeContent.memorialOrderCustomOperations ?? {});
    setOperationOverrides(financeContent.memorialOrderOperationOverrides ?? {});
    setHiddenOperations(financeContent.memorialOrderHiddenOperations ?? {});
  }, [
    financeContent.budgetAccountingSettings,
    financeContent.budgetAccountingJournal,
    financeContent.memorialOrderCustomOperations,
    financeContent.memorialOrderOperationOverrides,
    financeContent.memorialOrderHiddenOperations,
  ]);

  async function persist(
    nextSettings: BudgetAccountingSettings,
    nextEntries: BudgetAccountingJournalEntry[],
    nextCustomOps: Record<string, MemorialOrderOperation[]>,
    nextOperationOverrides: Record<string, MemorialOrderOperationOverride>,
    nextHiddenOps: Record<string, string[]>
  ): Promise<void> {
    setSaving(true);
    setError('');
    const payload: OrganizationSectionContent = {
      ...financeContent,
      summary: financeContent.summary?.trim() || t('financeDefaultSummary'),
      budgetAccountingSettings: nextSettings,
      budgetAccountingJournal: nextEntries,
      memorialOrderCustomOperations: nextCustomOps,
      memorialOrderOperationOverrides: nextOperationOverrides,
      memorialOrderHiddenOperations: nextHiddenOps,
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
        memorialOrderHiddenOperations:
          saved.memorialOrderHiddenOperations ?? payload.memorialOrderHiddenOperations,
      });
      setSettings(resolveBudgetAccountingSettings(saved));
      setEntries(saved.budgetAccountingJournal ?? nextEntries);
      setCustomOperations(saved.memorialOrderCustomOperations ?? nextCustomOps);
      setOperationOverrides(saved.memorialOrderOperationOverrides ?? nextOperationOverrides);
      setHiddenOperations(saved.memorialOrderHiddenOperations ?? nextHiddenOps);
    } finally {
      setSaving(false);
    }
  }

  if (!supportsBudgetAccounting(organizationId)) {
    return null;
  }

  return (
    <section id="finance-nyah-memorial-orders" className="space-y-4">
      <div>
        <p className="page-eyebrow">{t('financeNavNyahMemorialOrders')}</p>
        <h2 className="text-lg font-semibold">{t('nyahTabMemorial')}</h2>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {t('nyahInstructionRef', {
            number: NYAH_INSTRUCTION.number,
            date: NYAH_INSTRUCTION.date,
            issuer: NYAH_INSTRUCTION.issuer,
          })}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <FinanceMemorialOrdersPanel
        settings={settings}
        entries={entries}
        customOperations={customOperations}
        operationOverrides={operationOverrides}
        hiddenOperations={hiddenOperations}
        onCustomOperationsChange={setCustomOperations}
        onOperationOverridesChange={setOperationOverrides}
        onHiddenOperationsChange={setHiddenOperations}
        onEntriesChange={setEntries}
        onPersist={persist}
        saving={saving}
      />
    </section>
  );
}
