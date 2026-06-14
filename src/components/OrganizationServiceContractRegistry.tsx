'use client';

import UserContentText from '@/components/UserContentText';
import { formatAppDate } from '@/lib/intl-locale';
import {
  contractValidityLabel,
  EMPTY_CONTRACT_REGISTRY_FILTERS,
  filterServiceContracts,
  ServiceContractRegistryFilters,
} from '@/lib/org-service-contracts';
import { OrganizationServiceContract } from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type Props = {
  contracts: OrganizationServiceContract[];
  canEdit: boolean;
  onOpen: (contract: OrganizationServiceContract) => void;
  onAdd: () => void;
};

const STATUS_CLASS: Record<OrganizationServiceContract['status'], string> = {
  draft: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  completed: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  terminated: 'border-red-500/30 bg-red-500/10 text-red-300',
};

export default function OrganizationServiceContractRegistry({
  contracts,
  canEdit,
  onOpen,
  onAdd,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [filters, setFilters] = useState<ServiceContractRegistryFilters>(
    EMPTY_CONTRACT_REGISTRY_FILTERS
  );

  const filtered = useMemo(() => filterServiceContracts(contracts, filters), [contracts, filters]);
  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '';

  function formatDate(value: string) {
    return formatAppDate(value, locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function statusLabel(status: OrganizationServiceContract['status']) {
    switch (status) {
      case 'draft':
        return t('orgContractsStatusDraft');
      case 'active':
        return t('orgContractsStatusActive');
      case 'completed':
        return t('orgContractsStatusCompleted');
      case 'terminated':
        return t('orgContractsStatusTerminated');
    }
  }

  return (
    <div className="space-y-4">
      <div className="gov-content-panel space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="field-label">{t('orgContractsRegistrySearch')}</label>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder={t('orgContractsRegistrySearchPlaceholder')}
              className="input-field"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="field-label">{t('orgContractsRegistryColStatus')}</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as ServiceContractRegistryFilters['status'],
                })
              }
              className="input-field"
            >
              <option value="all">{t('orgContractsRegistryStatusAll')}</option>
              <option value="draft">{t('orgContractsStatusDraft')}</option>
              <option value="active">{t('orgContractsStatusActive')}</option>
              <option value="completed">{t('orgContractsStatusCompleted')}</option>
              <option value="terminated">{t('orgContractsStatusTerminated')}</option>
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="field-label">{t('orgContractsRegistryDateFrom')}</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="field-label">{t('orgContractsRegistryDateTo')}</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="input-field"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setFilters(EMPTY_CONTRACT_REGISTRY_FILTERS)}
            >
              {t('orgContractsRegistryResetFilters')}
            </button>
          )}
          {canEdit && (
            <button type="button" className="btn-primary text-xs" onClick={onAdd}>
              {t('orgContractsAddContract')}
            </button>
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          {t('orgContractsRegistryCount', { shown: filtered.length, total: contracts.length })}
        </p>
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t('orgContractsRegistryNoContracts')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t('orgContractsRegistryEmpty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[880px] border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--bg-input)]/60 text-left text-[var(--text-muted)]">
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColNumber')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsContractNumber')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColDate')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsCounterpartyName')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsSubject')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-right">
                  {t('orgContractsAmount')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColPeriod')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColStatus')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contract, index) => (
                <tr
                  key={contract.id}
                  className="border-b border-[var(--border)]/70 transition hover:bg-[var(--bg-input)]/30"
                >
                  <td className="px-3 py-2.5 text-[var(--text-muted)]">{index + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-[var(--text)]">
                    {contract.contractNumber}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(contract.preparedAt)}</td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <UserContentText text={contract.counterpartyName || '—'} as="span" />
                  </td>
                  <td className="px-3 py-2.5 max-w-[220px]">
                    <UserContentText text={contract.subject || '—'} as="span" />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                    {contract.amount} {contract.currency}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[var(--text-muted)]">
                    {contractValidityLabel(contract)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_CLASS[contract.status]}`}
                    >
                      {statusLabel(contract.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-[11px]"
                      onClick={() => onOpen(contract)}
                    >
                      {t('open')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
