'use client';

import OrganizationServiceInvoiceDocument from '@/components/OrganizationServiceInvoiceDocument';
import UserContentText from '@/components/UserContentText';
import { exportDocument, type ExportFormat } from '@/lib/document-export';
import { formatAppDate } from '@/lib/intl-locale';
import {
  EMPTY_INVOICE_REGISTRY_FILTERS,
  filterServiceInvoices,
  ServiceInvoiceRegistryFilters,
} from '@/lib/org-service-contracts';
import { printDocument } from '@/lib/print-document';
import { Organization } from '@/types/organization';
import {
  ContractCounterparty,
  OrganizationServiceInvoice,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

const EXPORT_DOCUMENT_ID = 'org-invoice-registry-export';

type Props = {
  organizationId: string;
  organizationName: string;
  organization?: Organization;
  invoices: OrganizationServiceInvoice[];
  counterpartyMap: Map<string, ContractCounterparty>;
  onOpen: (invoice: OrganizationServiceInvoice) => void;
};

const STATUS_CLASS: Record<OrganizationServiceInvoice['status'], string> = {
  draft: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  issued: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-red-500/30 bg-red-500/10 text-red-300',
};

export default function OrganizationServiceInvoiceRegistry({
  organizationId,
  organizationName,
  organization,
  invoices,
  counterpartyMap,
  onOpen,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const [filters, setFilters] = useState<ServiceInvoiceRegistryFilters>(
    EMPTY_INVOICE_REGISTRY_FILTERS
  );
  const [exportInvoice, setExportInvoice] = useState<OrganizationServiceInvoice | null>(null);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const filtered = useMemo(() => filterServiceInvoices(invoices, filters), [invoices, filters]);
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

  function statusLabel(status: OrganizationServiceInvoice['status']) {
    switch (status) {
      case 'draft':
        return t('orgContractsInvoiceStatusDraft');
      case 'issued':
        return t('orgContractsInvoiceStatusIssued');
      case 'paid':
        return t('orgContractsInvoiceStatusPaid');
      case 'cancelled':
        return t('orgContractsInvoiceStatusCancelled');
    }
  }

  async function mountInvoiceDocument(invoice: OrganizationServiceInvoice) {
    setExportInvoice(invoice);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  async function runDocumentAction(
    invoice: OrganizationServiceInvoice,
    action: 'print' | ExportFormat
  ) {
    setBusyInvoiceId(invoice.id);
    setActionError('');
    try {
      await mountInvoiceDocument(invoice);
      if (action === 'print') {
        printDocument(EXPORT_DOCUMENT_ID);
      } else {
        await exportDocument({
          documentId: EXPORT_DOCUMENT_ID,
          format: action,
          filename: `invoice-${invoice.invoiceNumber}`,
        });
      }
    } catch (error) {
      console.error('Invoice document action failed:', error);
      setActionError(t('documentExportError'));
    } finally {
      setBusyInvoiceId(null);
    }
  }

  function actionButton(
    invoice: OrganizationServiceInvoice,
    label: string,
    action: 'print' | ExportFormat
  ) {
    const busy = busyInvoiceId === invoice.id;
    return (
      <button
        type="button"
        className="btn-secondary px-1.5 py-0.5 text-[10px] whitespace-nowrap disabled:opacity-50"
        disabled={busy}
        onClick={() => void runDocumentAction(invoice, action)}
      >
        {busy ? '...' : label}
      </button>
    );
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
              placeholder={t('orgContractsInvoiceRegistrySearchPlaceholder')}
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
                  status: e.target.value as ServiceInvoiceRegistryFilters['status'],
                })
              }
              className="input-field"
            >
              <option value="all">{t('orgContractsRegistryStatusAll')}</option>
              <option value="draft">{t('orgContractsInvoiceStatusDraft')}</option>
              <option value="issued">{t('orgContractsInvoiceStatusIssued')}</option>
              <option value="paid">{t('orgContractsInvoiceStatusPaid')}</option>
              <option value="cancelled">{t('orgContractsInvoiceStatusCancelled')}</option>
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
              onClick={() => setFilters(EMPTY_INVOICE_REGISTRY_FILTERS)}
            >
              {t('orgContractsRegistryResetFilters')}
            </button>
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          {t('orgContractsRegistryCount', { shown: filtered.length, total: invoices.length })}
        </p>
      </div>

      {actionError && (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {actionError}
        </p>
      )}

      {invoices.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t('orgContractsRegistryNoInvoices')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t('orgContractsInvoiceRegistryEmpty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[1080px] border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--bg-input)]/60 text-left text-[var(--text-muted)]">
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColNumber')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsInvoiceNumber')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColDate')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColContract')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsCounterpartyName')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold text-right">
                  {t('orgContractsTotal')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColDueDate')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColStatus')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColDocument')}
                </th>
                <th className="border-b border-[var(--border)] px-3 py-2.5 font-semibold">
                  {t('orgContractsRegistryColActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice, index) => (
                <tr
                  key={invoice.id}
                  className="border-b border-[var(--border)]/70 transition hover:bg-[var(--bg-input)]/30"
                >
                  <td className="px-3 py-2.5 text-[var(--text-muted)]">{index + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-[var(--text)]">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(invoice.preparedAt)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{invoice.contractNumber}</td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <UserContentText text={invoice.counterpartyName || '—'} as="span" />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                    {invoice.total} TJS
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(invoice.dueDate)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_CLASS[invoice.status]}`}
                    >
                      {statusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {actionButton(invoice, t('print'), 'print')}
                      {actionButton(invoice, 'PDF', 'pdf')}
                      {actionButton(invoice, 'Word', 'word')}
                      {actionButton(invoice, 'Excel', 'excel')}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="btn-secondary px-2 py-1 text-[11px]"
                      onClick={() => onOpen(invoice)}
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

      <div className="pointer-events-none fixed left-[-10000px] top-0 z-[-1]" aria-hidden>
        {exportInvoice && (
          <div id={EXPORT_DOCUMENT_ID}>
            <OrganizationServiceInvoiceDocument
              organizationId={organizationId}
              organizationName={organizationName}
              organization={organization}
              invoice={exportInvoice}
              counterparty={counterpartyMap.get(exportInvoice.counterpartyId)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
