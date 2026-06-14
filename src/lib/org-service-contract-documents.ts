import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import { DEFAULT_VAT_RATE } from '@/lib/org-service-contracts';
import { Organization } from '@/types/organization';
import {
  OrganizationServiceContract,
  OrganizationServiceInvoice,
} from '@/types/organization-section';

export type PartyRequisites = {
  name: string;
  legalForm?: string;
  tin?: string;
  address?: string;
  director?: string;
  phone?: string;
  bankName?: string;
  bankBik?: string;
  correspondentAccount?: string;
  bankAccount?: string;
};

export function organizationPartyRequisites(
  organizationName: string,
  organization?: Organization
): PartyRequisites {
  return {
    name: organizationName,
    legalForm: organization?.status,
    tin: organization?.rma,
    address: organization?.address,
    director: organization?.director,
    phone: organization?.phone ?? organization?.directorPhone,
  };
}

export function counterpartyPartyRequisites(
  counterparty?: Partial<PartyRequisites> & { name?: string }
): PartyRequisites {
  return {
    name: counterparty?.name ?? '',
    legalForm: counterparty?.legalForm,
    tin: counterparty?.tin,
    address: counterparty?.address,
    director: counterparty?.director,
    phone: counterparty?.phone,
    bankName: counterparty?.bankName,
    bankBik: counterparty?.bankBik,
    correspondentAccount: counterparty?.correspondentAccount,
    bankAccount: counterparty?.bankAccount,
  };
}

export function contractAmountBreakdown(contract: OrganizationServiceContract): {
  subtotal: string;
  vatAmount: string;
  total: string;
} {
  const base = parseAmount(contract.amount) ?? 0;
  if (!contract.vatApplicable) {
    return {
      subtotal: formatAmount(base),
      vatAmount: formatAmount(0),
      total: formatAmount(base),
    };
  }
  const vat = (base * contract.vatRate) / 100;
  return {
    subtotal: formatAmount(base),
    vatAmount: formatAmount(vat),
    total: formatAmount(base + vat),
  };
}

export function formatRequisiteLine(label: string, value?: string): string | null {
  if (!value?.trim()) return null;
  return `${label}: ${value.trim()}`;
}

export function partyRequisiteLines(party: PartyRequisites): string[] {
  return [
    formatRequisiteLine('Ному пурра', party.name),
    formatRequisiteLine('Шакли ҳуқуқӣ', party.legalForm),
    formatRequisiteLine('РМА (ИНН)', party.tin),
    formatRequisiteLine('Суроға', party.address),
    formatRequisiteLine('Роҳбар', party.director),
    formatRequisiteLine('Телефон', party.phone),
    formatRequisiteLine('Бонк', party.bankName),
    formatRequisiteLine('БИК', party.bankBik),
    formatRequisiteLine('Корсчет', party.correspondentAccount),
    formatRequisiteLine('Ҳисоби бонкӣ', party.bankAccount),
  ].filter((line): line is string => Boolean(line));
}

export function contractValidityText(contract: OrganizationServiceContract): string {
  if (contract.validTo) {
    return `аз ${contract.validFrom} то ${contract.validTo}`;
  }
  return `аз ${contract.validFrom}`;
}

export function invoiceHasVat(invoice: OrganizationServiceInvoice): boolean {
  return invoice.vatRate > 0 && parseAmount(invoice.vatAmount) !== 0;
}

export const CONTRACT_LEGAL_FOOTNOTE =
  'Ин шартнома мувофиқи моддаҳои 307–341 Кодекси шаҳрвандии Ҷумҳурии Тоҷикистон, Қонуни ҶТ «Дар бораи соҳибкорӣ» ва қонунгузории амалкунандаи Ҷумҳурии Тоҷикистон тартиб дода шудааст.';

export const INVOICE_LEGAL_FOOTNOTE =
  `Ин ҳисобнома-фактура ҳуҷҷати андозӣ буда, мувофиқи Кодекси андози Ҷумҳурии Тоҷикистон (ААИ ${DEFAULT_VAT_RATE}%) ва Қонуни ҶТ «Дар бораи бухгалтерии ҳисобот ва ҳисоботи молиявӣ» тартиб дода мешавад.`;
