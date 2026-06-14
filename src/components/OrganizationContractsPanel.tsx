'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import {
  calcInvoiceTotals,
  calcLineItemAmount,
  createContractCounterparty,
  createInvoiceLineItem,
  createServiceContract,
  createServiceInvoice,
  DEFAULT_VAT_RATE,
  removeContract,
  removeCounterparty,
  removeInvoice,
  SERVICE_CONTRACT_LEGAL_BASIS,
  SERVICE_INVOICE_LEGAL_BASIS,
  sortContracts,
  sortInvoices,
  upsertContract,
  upsertCounterparty,
  upsertInvoice,
  validateContract,
  validateInvoice,
} from '@/lib/org-service-contracts';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { printDocument } from '@/lib/print-document';
import { Organization } from '@/types/organization';
import {
  ContractCounterparty,
  OrganizationSectionContent,
  OrganizationServiceContract,
  OrganizationServiceInvoice,
  ServiceInvoiceLineItem,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Tab = 'counterparties' | 'contracts' | 'invoices';

type Props = {
  organizationId: string;
  organization?: Organization;
  content: OrganizationSectionContent;
  onUpdate: (content: OrganizationSectionContent) => void;
};

export default function OrganizationContractsPanel({
  organizationId,
  organization,
  content,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { canEdit } = useOrganizationAccess();

  const [tab, setTab] = useState<Tab>('contracts');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const counterparties = content.contractCounterparties ?? [];
  const contracts = useMemo(() => sortContracts(content.serviceContracts), [content.serviceContracts]);
  const invoices = useMemo(() => sortInvoices(content.serviceInvoices), [content.serviceInvoices]);
  const counterpartyMap = useMemo(
    () => new Map(counterparties.map((item) => [item.id, item])),
    [counterparties]
  );

  const [cpDraft, setCpDraft] = useState<ContractCounterparty>(createContractCounterparty());
  const [cpSelectedId, setCpSelectedId] = useState<string | null>(null);
  const [cpEditing, setCpEditing] = useState(false);

  const [contractDraft, setContractDraft] = useState<OrganizationServiceContract>(
    createServiceContract(contracts.map((item) => item.contractNumber))
  );
  const [contractSelectedId, setContractSelectedId] = useState<string | null>(null);
  const [contractEditing, setContractEditing] = useState(false);

  const [invoiceDraft, setInvoiceDraft] = useState<OrganizationServiceInvoice | null>(null);
  const [invoiceSelectedId, setInvoiceSelectedId] = useState<string | null>(null);
  const [invoiceEditing, setInvoiceEditing] = useState(false);

  useEffect(() => {
    if (contractSelectedId && contracts.some((item) => item.id === contractSelectedId)) return;
    if (contracts.length > 0) {
      setContractSelectedId(contracts[0].id);
      setContractDraft(contracts[0]);
      setContractEditing(false);
      return;
    }
    setContractSelectedId(null);
    setContractDraft(createServiceContract([]));
    setContractEditing(canEdit);
  }, [contracts, contractSelectedId, canEdit]);

  useEffect(() => {
    if (invoiceSelectedId && invoices.some((item) => item.id === invoiceSelectedId)) return;
    if (invoices.length > 0) {
      setInvoiceSelectedId(invoices[0].id);
      setInvoiceDraft(invoices[0]);
      setInvoiceEditing(false);
      return;
    }
    setInvoiceSelectedId(null);
    setInvoiceDraft(null);
    setInvoiceEditing(false);
  }, [invoices, invoiceSelectedId]);

  async function persist(next: OrganizationSectionContent) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateOrganizationSection(organizationId, 'organization-contracts', next);
      onUpdate(next);
      setNotice(t('orgContractsSaved'));
    } catch {
      setError(t('orgContractsSaveError'));
    } finally {
      setSaving(false);
    }
  }

  function patchContent(patch: Partial<OrganizationSectionContent>) {
    return { ...content, ...patch };
  }

  async function saveCounterparty() {
    if (!cpDraft.name.trim()) {
      setError(t('orgContractsCounterpartyNameRequired'));
      return;
    }
    await persist(
      patchContent({ contractCounterparties: upsertCounterparty(counterparties, cpDraft) })
    );
    setCpSelectedId(cpDraft.id);
    setCpEditing(false);
  }

  async function deleteCounterparty(id: string) {
    if (!confirm(t('orgContractsConfirmDeleteCounterparty'))) return;
    await persist(
      patchContent({ contractCounterparties: removeCounterparty(counterparties, id) })
    );
  }

  async function saveContract() {
    const validation = validateContract(contractDraft);
    if (validation) {
      setError(t(validation));
      return;
    }
    await persist(
      patchContent({ serviceContracts: upsertContract(content.serviceContracts, contractDraft) })
    );
    setContractSelectedId(contractDraft.id);
    setContractEditing(false);
  }

  async function deleteContract(id: string) {
    if (!confirm(t('orgContractsConfirmDeleteContract'))) return;
    await persist(
      patchContent({
        serviceContracts: removeContract(content.serviceContracts, id),
        serviceInvoices: (content.serviceInvoices ?? []).filter((item) => item.contractId !== id),
      })
    );
  }

  function applyCounterpartyToContract(counterpartyId: string) {
    const cp = counterpartyMap.get(counterpartyId);
    setContractDraft((current) => ({
      ...current,
      counterpartyId,
      counterpartyName: cp?.name ?? '',
    }));
  }

  async function saveInvoice() {
    if (!invoiceDraft) return;
    const validation = validateInvoice(invoiceDraft);
    if (validation) {
      setError(t(validation));
      return;
    }
    await persist(
      patchContent({ serviceInvoices: upsertInvoice(content.serviceInvoices, invoiceDraft) })
    );
    setInvoiceSelectedId(invoiceDraft.id);
    setInvoiceEditing(false);
  }

  async function deleteInvoice(id: string) {
    if (!confirm(t('orgContractsConfirmDeleteInvoice'))) return;
    await persist(
      patchContent({ serviceInvoices: removeInvoice(content.serviceInvoices, id) })
    );
  }

  function startInvoiceFromContract(contract: OrganizationServiceContract) {
    const cp = counterpartyMap.get(contract.counterpartyId);
    const draft = createServiceInvoice(
      contract,
      cp,
      invoices.map((item) => item.invoiceNumber)
    );
    setInvoiceDraft(draft);
    setInvoiceSelectedId(null);
    setInvoiceEditing(true);
    setTab('invoices');
  }

  function patchInvoiceLine(index: number, patch: Partial<ServiceInvoiceLineItem>) {
    if (!invoiceDraft) return;
    const lineItems = invoiceDraft.lineItems.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...patch };
      if ('quantity' in patch || 'unitPrice' in patch) {
        next.amount = calcLineItemAmount(next.quantity, next.unitPrice);
      }
      return next;
    });
    const totals = calcInvoiceTotals(lineItems, invoiceDraft.vatRate, invoiceDraft.vatRate > 0);
    setInvoiceDraft({ ...invoiceDraft, lineItems, ...totals });
  }

  const tabButton = (value: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      className={tab === value ? 'btn-primary px-3 py-1.5 text-xs' : 'btn-secondary px-3 py-1.5 text-xs'}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-3 text-xs leading-relaxed text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">{t('orgContractsLegalIntro')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {SERVICE_CONTRACT_LEGAL_BASIS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabButton('counterparties', t('orgContractsTabCounterparties'))}
        {tabButton('contracts', t('orgContractsTabContracts'))}
        {tabButton('invoices', t('orgContractsTabInvoices'))}
      </div>

      {(error || notice) && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            error
              ? 'border-[var(--danger)]/40 bg-red-500/10 text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {error || notice}
        </div>
      )}

      {tab === 'counterparties' && (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {canEdit && (
              <button
                type="button"
                className="btn-primary w-full text-xs"
                onClick={() => {
                  setCpDraft(createContractCounterparty());
                  setCpSelectedId(null);
                  setCpEditing(true);
                }}
              >
                {t('orgContractsAddCounterparty')}
              </button>
            )}
            {counterparties.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCpSelectedId(item.id);
                  setCpDraft(item);
                  setCpEditing(false);
                }}
                className={`block w-full rounded-lg border px-3 py-2 text-left text-xs ${
                  cpSelectedId === item.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                {item.name || t('orgContractsUnnamed')}
              </button>
            ))}
          </div>
          <div className="gov-content-panel space-y-3">
            {cpEditing || cpSelectedId ? (
              <>
                <input
                  value={cpDraft.name}
                  readOnly={!cpEditing}
                  onChange={(e) => setCpDraft({ ...cpDraft, name: e.target.value })}
                  placeholder={t('orgContractsCounterpartyName')}
                  className="input-field"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={cpDraft.legalForm ?? ''} readOnly={!cpEditing} onChange={(e) => setCpDraft({ ...cpDraft, legalForm: e.target.value })} placeholder={t('orgContractsLegalForm')} className="input-field" />
                  <input value={cpDraft.tin ?? ''} readOnly={!cpEditing} onChange={(e) => setCpDraft({ ...cpDraft, tin: e.target.value })} placeholder={t('orgContractsTin')} className="input-field" />
                  <input value={cpDraft.director ?? ''} readOnly={!cpEditing} onChange={(e) => setCpDraft({ ...cpDraft, director: e.target.value })} placeholder={t('orgContractsDirector')} className="input-field" />
                  <input value={cpDraft.phone ?? ''} readOnly={!cpEditing} onChange={(e) => setCpDraft({ ...cpDraft, phone: e.target.value })} placeholder={t('orgContractsPhone')} className="input-field" />
                </div>
                <input value={cpDraft.address ?? ''} readOnly={!cpEditing} onChange={(e) => setCpDraft({ ...cpDraft, address: e.target.value })} placeholder={t('orgContractsAddress')} className="input-field" />
                <input value={cpDraft.bankName ?? ''} readOnly={!cpEditing} onChange={(e) => setCpDraft({ ...cpDraft, bankName: e.target.value })} placeholder={t('orgContractsBankName')} className="input-field" />
                <input value={cpDraft.bankAccount ?? ''} readOnly={!cpEditing} onChange={(e) => setCpDraft({ ...cpDraft, bankAccount: e.target.value })} placeholder={t('orgContractsBankAccount')} className="input-field" />
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    {cpEditing ? (
                      <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveCounterparty()}>
                        {saving ? '...' : t('save')}
                      </button>
                    ) : (
                      <button type="button" className="btn-secondary" onClick={() => setCpEditing(true)}>
                        {t('edit')}
                      </button>
                    )}
                    {cpSelectedId && (
                      <button type="button" className="btn-danger" disabled={saving} onClick={() => void deleteCounterparty(cpSelectedId)}>
                        {t('deleteProject')}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">{t('orgContractsSelectCounterparty')}</p>
            )}
          </div>
        </div>
      )}

      {tab === 'contracts' && (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {canEdit && (
              <button
                type="button"
                className="btn-primary w-full text-xs"
                onClick={() => {
                  setContractDraft(createServiceContract(contracts.map((item) => item.contractNumber)));
                  setContractSelectedId(null);
                  setContractEditing(true);
                }}
              >
                {t('orgContractsAddContract')}
              </button>
            )}
            {contracts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setContractSelectedId(item.id);
                  setContractDraft(item);
                  setContractEditing(false);
                }}
                className={`block w-full rounded-lg border px-3 py-2 text-left text-xs ${
                  contractSelectedId === item.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                <span className="font-semibold">{item.contractNumber}</span>
                <span className="mt-1 block text-[var(--text-muted)]">{item.counterpartyName}</span>
              </button>
            ))}
          </div>
          <div className="gov-content-panel space-y-3">
            <div id="org-contract-print">
              <OrganizationReportDocumentHeader />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={contractDraft.contractNumber} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, contractNumber: e.target.value })} className="input-field" placeholder={t('orgContractsContractNumber')} />
                <input type="date" value={contractDraft.preparedAt} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, preparedAt: e.target.value })} className="input-field" />
                <select value={contractDraft.counterpartyId} disabled={!contractEditing} onChange={(e) => applyCounterpartyToContract(e.target.value)} className="input-field sm:col-span-2">
                  <option value="">{t('orgContractsSelectCounterparty')}</option>
                  {counterparties.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <input value={contractDraft.subject} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, subject: e.target.value })} className="input-field sm:col-span-2" placeholder={t('orgContractsSubject')} />
                <textarea value={contractDraft.servicesDescription} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, servicesDescription: e.target.value })} className="input-field sm:col-span-2" rows={3} placeholder={t('orgContractsServices')} />
                <input value={contractDraft.amount} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, amount: e.target.value })} className="input-field" placeholder={t('orgContractsAmount')} />
                <select value={contractDraft.status} disabled={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, status: e.target.value as OrganizationServiceContract['status'] })} className="input-field">
                  <option value="draft">{t('orgContractsStatusDraft')}</option>
                  <option value="active">{t('orgContractsStatusActive')}</option>
                  <option value="completed">{t('orgContractsStatusCompleted')}</option>
                  <option value="terminated">{t('orgContractsStatusTerminated')}</option>
                </select>
                <input type="date" value={contractDraft.validFrom} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, validFrom: e.target.value })} className="input-field" />
                <input type="date" value={contractDraft.validTo ?? ''} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, validTo: e.target.value || undefined })} className="input-field" />
                <label className="flex items-center gap-2 text-xs sm:col-span-2">
                  <input type="checkbox" checked={contractDraft.vatApplicable} disabled={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, vatApplicable: e.target.checked })} />
                  {t('orgContractsVatApplicable', { rate: DEFAULT_VAT_RATE })}
                </label>
                <textarea value={contractDraft.paymentTerms} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, paymentTerms: e.target.value })} className="input-field sm:col-span-2" rows={2} placeholder={t('orgContractsPaymentTerms')} />
                <textarea value={contractDraft.legalBasis} readOnly={!contractEditing} onChange={(e) => setContractDraft({ ...contractDraft, legalBasis: e.target.value })} className="input-field sm:col-span-2" rows={2} placeholder={t('orgContractsLegalBasis')} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <DocumentExportMenu documentId="org-contract-print" filename={`contract-${contractDraft.contractNumber}`} />
              <button type="button" className="btn-secondary" onClick={() => printDocument('org-contract-print')}>{t('print')}</button>
              {canEdit && !contractEditing && contractSelectedId && (
                <button type="button" className="btn-secondary" onClick={() => startInvoiceFromContract(contractDraft)}>
                  {t('orgContractsCreateInvoice')}
                </button>
              )}
              {canEdit && (contractEditing ? (
                <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveContract()}>{saving ? '...' : t('save')}</button>
              ) : (
                <button type="button" className="btn-secondary" onClick={() => setContractEditing(true)}>{t('edit')}</button>
              ))}
              {canEdit && contractSelectedId && (
                <button type="button" className="btn-danger" disabled={saving} onClick={() => void deleteContract(contractSelectedId)}>{t('deleteProject')}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && invoiceDraft && (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {invoices.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setInvoiceSelectedId(item.id);
                  setInvoiceDraft(item);
                  setInvoiceEditing(false);
                }}
                className={`block w-full rounded-lg border px-3 py-2 text-left text-xs ${
                  invoiceSelectedId === item.id ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'
                }`}
              >
                <span className="font-semibold">{item.invoiceNumber}</span>
                <span className="mt-1 block text-[var(--text-muted)]">{item.total} TJS</span>
              </button>
            ))}
          </div>
          <div className="gov-content-panel space-y-3">
            <div id="org-invoice-print">
              <OrganizationReportDocumentHeader />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={invoiceDraft.invoiceNumber} readOnly={!invoiceEditing} onChange={(e) => setInvoiceDraft({ ...invoiceDraft, invoiceNumber: e.target.value })} className="input-field" />
                <input type="date" value={invoiceDraft.preparedAt} readOnly={!invoiceEditing} onChange={(e) => setInvoiceDraft({ ...invoiceDraft, preparedAt: e.target.value })} className="input-field" />
                <input type="date" value={invoiceDraft.dueDate} readOnly={!invoiceEditing} onChange={(e) => setInvoiceDraft({ ...invoiceDraft, dueDate: e.target.value })} className="input-field" />
                <input value={invoiceDraft.contractNumber} readOnly className="input-field" />
              </div>
              {invoiceDraft.lineItems.map((line, index) => (
                <div key={index} className="mt-3 grid gap-2 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-5">
                  <input value={line.description} readOnly={!invoiceEditing} onChange={(e) => patchInvoiceLine(index, { description: e.target.value })} className="input-field sm:col-span-2" placeholder={t('orgContractsLineDescription')} />
                  <input value={line.quantity} readOnly={!invoiceEditing} onChange={(e) => patchInvoiceLine(index, { quantity: e.target.value })} className="input-field" />
                  <input value={line.unitPrice} readOnly={!invoiceEditing} onChange={(e) => patchInvoiceLine(index, { unitPrice: e.target.value })} className="input-field" />
                  <input value={line.amount} readOnly className="input-field" />
                </div>
              ))}
              {invoiceEditing && (
                <button type="button" className="btn-secondary mt-2 text-xs" onClick={() => {
                  const lineItems = [...invoiceDraft.lineItems, createInvoiceLineItem()];
                  const totals = calcInvoiceTotals(lineItems, invoiceDraft.vatRate, invoiceDraft.vatRate > 0);
                  setInvoiceDraft({ ...invoiceDraft, lineItems, ...totals });
                }}>{t('orgContractsAddLine')}</button>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                <p>{t('orgContractsSubtotal')}: <strong>{invoiceDraft.subtotal}</strong></p>
                <p>{t('orgContractsVat', { rate: invoiceDraft.vatRate })}: <strong>{invoiceDraft.vatAmount}</strong></p>
                <p>{t('orgContractsTotal')}: <strong>{invoiceDraft.total}</strong></p>
              </div>
              <textarea value={invoiceDraft.paymentPurpose} readOnly={!invoiceEditing} onChange={(e) => setInvoiceDraft({ ...invoiceDraft, paymentPurpose: e.target.value })} className="input-field mt-3" rows={2} />
              <textarea value={invoiceDraft.legalBasis} readOnly={!invoiceEditing} onChange={(e) => setInvoiceDraft({ ...invoiceDraft, legalBasis: e.target.value })} className="input-field mt-2" rows={2} />
            </div>
            <div className="flex flex-wrap gap-2">
              <DocumentExportMenu documentId="org-invoice-print" filename={`invoice-${invoiceDraft.invoiceNumber}`} />
              <button type="button" className="btn-secondary" onClick={() => printDocument('org-invoice-print')}>{t('print')}</button>
              {canEdit && (invoiceEditing ? (
                <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveInvoice()}>{saving ? '...' : t('save')}</button>
              ) : (
                <button type="button" className="btn-secondary" onClick={() => setInvoiceEditing(true)}>{t('edit')}</button>
              ))}
              {canEdit && invoiceSelectedId && (
                <button type="button" className="btn-danger" disabled={saving} onClick={() => void deleteInvoice(invoiceSelectedId)}>{t('deleteProject')}</button>
              )}
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3 text-xs text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text)]">{t('orgContractsInvoiceLegalIntro')}</p>
              <ul className="mt-2 list-disc pl-5">
                {SERVICE_INVOICE_LEGAL_BASIS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && !invoiceDraft && (
        <p className="text-sm text-[var(--text-muted)]">{t('orgContractsNoInvoices')}</p>
      )}
    </div>
  );
}
