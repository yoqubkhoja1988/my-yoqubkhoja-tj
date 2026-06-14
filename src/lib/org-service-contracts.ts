import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import {
  ContractCounterparty,
  OrganizationServiceContract,
  OrganizationServiceInvoice,
  ServiceInvoiceLineItem,
} from '@/types/organization-section';

export const ORGANIZATION_CONTRACTS_SECTION_SLUG = 'organization-contracts';

/** Стандартии ААИ (НДС) дар ҶТ — 14% */
export const DEFAULT_VAT_RATE = 14;

export const SERVICE_CONTRACT_LEGAL_BASIS = [
  'Кодекси шаҳрвандии Ҷумҳурии Тоҷикистон (шартномаҳо)',
  'Қонуни ҶТ «Дар бораи соҳибкорӣ»',
  'Қонуни ҶТ «Дар бораи иҷозатномаҳои хизматрасмонӣ ва фаъолиятҳои иҷозатпазир»',
] as const;

export const SERVICE_INVOICE_LEGAL_BASIS = [
  'Кодекси андози Ҷумҳурии Тоҷикистон (ҳисобнома-фактура, ААИ)',
  'Қонуни ҶТ «Дар бораи бухгалтерии ҳисобот ва ҳисоботи молиявӣ»',
  'Шартномаи хизматрасмонии тарафин',
] as const;

export const DEFAULT_PAYMENT_TERMS =
  'Пардохт дар муҳлати 10 (даҳ) рӯзи корӣ пас аз қабули хизматрасониҳо бо интиқоли банкӣ ба ҳисоби бонкии Иҷрокунанда, мувофиқи Қонуни ҶТ «Дар бораи бухгалтерии ҳисобот ва ҳисоботи молиявӣ» ва ҳуҷҷатҳои тасдиқкунанда.';

function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}`;
}

function yearFromDate(date: string): string {
  return date.slice(0, 4);
}

function nextSequence(prefix: string, year: string, existing: string[]): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const value of existing) {
    const match = value.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
}

export function createContractCounterparty(): ContractCounterparty {
  return { id: newId('cp'), name: '' };
}

export function createServiceContract(
  contractNumbers: string[] = [],
  date = new Date().toISOString().slice(0, 10)
): OrganizationServiceContract {
  const year = yearFromDate(date);
  return {
    id: newId('contract'),
    contractNumber: nextSequence('ДХ', year, contractNumbers),
    preparedAt: date,
    validFrom: date,
    counterpartyId: '',
    counterpartyName: '',
    subject: '',
    servicesDescription: '',
    amount: '0,00',
    currency: 'TJS',
    vatApplicable: true,
    vatRate: DEFAULT_VAT_RATE,
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    legalBasis: SERVICE_CONTRACT_LEGAL_BASIS.join('; '),
    status: 'draft',
  };
}

export function createInvoiceLineItem(): ServiceInvoiceLineItem {
  return {
    description: '',
    quantity: '1',
    unit: 'хизмат',
    unitPrice: '0,00',
    amount: '0,00',
  };
}

export function calcLineItemAmount(quantity: string, unitPrice: string): string {
  const q = parseAmount(quantity);
  const p = parseAmount(unitPrice);
  if (q === null || p === null) return '0,00';
  return formatAmount(q * p);
}

export function calcInvoiceTotals(
  lineItems: ServiceInvoiceLineItem[],
  vatRate: number,
  vatApplicable: boolean
): { subtotal: string; vatAmount: string; total: string } {
  let subtotal = 0;
  for (const item of lineItems) {
    const amount = parseAmount(item.amount);
    if (amount !== null) subtotal += amount;
  }
  const vatAmount = vatApplicable ? (subtotal * vatRate) / 100 : 0;
  const total = subtotal + vatAmount;
  return {
    subtotal: formatAmount(subtotal),
    vatAmount: formatAmount(vatAmount),
    total: formatAmount(total),
  };
}

export function createServiceInvoice(
  contract: OrganizationServiceContract,
  counterparty: ContractCounterparty | undefined,
  invoiceNumbers: string[] = [],
  date = new Date().toISOString().slice(0, 10)
): OrganizationServiceInvoice {
  const year = yearFromDate(date);
  const lineItems: ServiceInvoiceLineItem[] = [
    {
      description: contract.servicesDescription || contract.subject,
      quantity: '1',
      unit: 'хизмат',
      unitPrice: contract.amount,
      amount: contract.amount,
    },
  ];
  const totals = calcInvoiceTotals(lineItems, contract.vatRate, contract.vatApplicable);
  const due = new Date(date);
  due.setDate(due.getDate() + 10);

  return {
    id: newId('invoice'),
    invoiceNumber: nextSequence('ҲФ', year, invoiceNumbers),
    contractId: contract.id,
    contractNumber: contract.contractNumber,
    preparedAt: date,
    dueDate: due.toISOString().slice(0, 10),
    counterpartyId: contract.counterpartyId,
    counterpartyName: contract.counterpartyName,
    counterpartyTin: counterparty?.tin,
    counterpartyAddress: counterparty?.address,
    lineItems,
    subtotal: totals.subtotal,
    vatRate: contract.vatRate,
    vatAmount: totals.vatAmount,
    total: totals.total,
    paymentPurpose: contract.subject,
    legalBasis: SERVICE_INVOICE_LEGAL_BASIS.join('; '),
    status: 'draft',
  };
}

export function sortContracts(contracts: OrganizationServiceContract[] | undefined) {
  return [...(contracts ?? [])].sort((a, b) => b.preparedAt.localeCompare(a.preparedAt));
}

export function sortInvoices(invoices: OrganizationServiceInvoice[] | undefined) {
  return [...(invoices ?? [])].sort((a, b) => b.preparedAt.localeCompare(a.preparedAt));
}

export function upsertCounterparty(
  list: ContractCounterparty[] | undefined,
  item: ContractCounterparty
): ContractCounterparty[] {
  const all = [...(list ?? [])];
  const index = all.findIndex((entry) => entry.id === item.id);
  if (index >= 0) all[index] = item;
  else all.push(item);
  return all.sort((a, b) => a.name.localeCompare(b.name, 'tg'));
}

export function removeCounterparty(
  list: ContractCounterparty[] | undefined,
  id: string
): ContractCounterparty[] {
  return (list ?? []).filter((entry) => entry.id !== id);
}

export function upsertContract(
  list: OrganizationServiceContract[] | undefined,
  item: OrganizationServiceContract
): OrganizationServiceContract[] {
  const all = [...(list ?? [])];
  const index = all.findIndex((entry) => entry.id === item.id);
  if (index >= 0) all[index] = item;
  else all.push(item);
  return all;
}

export function removeContract(
  list: OrganizationServiceContract[] | undefined,
  id: string
): OrganizationServiceContract[] {
  return (list ?? []).filter((entry) => entry.id !== id);
}

export function upsertInvoice(
  list: OrganizationServiceInvoice[] | undefined,
  item: OrganizationServiceInvoice
): OrganizationServiceInvoice[] {
  const all = [...(list ?? [])];
  const index = all.findIndex((entry) => entry.id === item.id);
  if (index >= 0) all[index] = item;
  else all.push(item);
  return all;
}

export function removeInvoice(
  list: OrganizationServiceInvoice[] | undefined,
  id: string
): OrganizationServiceInvoice[] {
  return (list ?? []).filter((entry) => entry.id !== id);
}

export function validateContract(contract: OrganizationServiceContract): string | null {
  if (!contract.counterpartyId || !contract.counterpartyName.trim()) {
    return 'counterpartyRequired';
  }
  if (!contract.subject.trim()) return 'subjectRequired';
  if (!contract.servicesDescription.trim()) return 'servicesRequired';
  if (parseAmount(contract.amount) === null) return 'amountInvalid';
  if (!contract.validFrom) return 'validFromRequired';
  return null;
}

export function validateInvoice(invoice: OrganizationServiceInvoice): string | null {
  if (!invoice.contractId) return 'contractRequired';
  if (!invoice.lineItems.length) return 'lineItemsRequired';
  for (const item of invoice.lineItems) {
    if (!item.description.trim()) return 'lineDescriptionRequired';
    if (parseAmount(item.amount) === null) return 'lineAmountInvalid';
  }
  return null;
}
