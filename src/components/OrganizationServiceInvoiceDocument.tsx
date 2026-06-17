'use client';

import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import UserContentText from '@/components/UserContentText';
import { formatAppDate } from '@/lib/intl-locale';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import {
  INVOICE_LEGAL_FOOTNOTE,
  counterpartyPartyRequisites,
  invoiceHasVat,
  organizationPartyRequisites,
  partyRequisiteLines,
} from '@/lib/org-service-contract-documents';
import { Organization } from '@/types/organization';
import {
  ContractCounterparty,
  OrganizationServiceInvoice,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';

type Props = {
  organizationId: string;
  organizationName: string;
  organization?: Organization;
  invoice: OrganizationServiceInvoice;
  counterparty?: ContractCounterparty;
};

export default function OrganizationServiceInvoiceDocument({
  organizationId,
  organizationName,
  organization,
  invoice,
  counterparty,
}: Props) {
  const locale = useLocale();
  const t = useTranslations();
  const preparedAt = formatAppDate(invoice.preparedAt, locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const dueDate = formatAppDate(invoice.dueDate, locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const seller = organizationPartyRequisites(organizationName, organization);
  const buyer = counterpartyPartyRequisites({
    ...counterparty,
    name: counterparty?.name || invoice.counterpartyName,
    tin: counterparty?.tin || invoice.counterpartyTin,
    address: counterparty?.address || invoice.counterpartyAddress,
  });
  const directorLabel = getDirectorSignatureLabel(organizationId);
  const accountantLabel = getAccountantSignatureLabel(undefined, {
    chiefAccountantName: organization?.chiefAccountant,
    fallback: t('payrollLedgerAccountant'),
  });
  const withVat = invoiceHasVat(invoice);

  return (
    <article className="org-legal-document rounded-xl border border-[var(--border)] bg-white p-5 md:p-8">
      <OrganizationReportDocumentHeader variant="document" className="mb-4" />

      <h1 className="text-center text-base font-bold uppercase">
        Ҳисобнома-фактура (ҳуҷҷати андозӣ)
      </h1>
      <p className="mt-1 text-center text-sm font-semibold">№ {invoice.invoiceNumber}</p>
      <p className="text-center text-xs text-slate-600">Санаи тартибдиҳӣ: {preparedAt}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-slate-300 p-3 text-xs">
          <p className="mb-2 font-bold uppercase text-slate-900">Иҷрокунанда (фурӯшанда)</p>
          {partyRequisiteLines(seller).map((line) => (
            <p key={line}>
              <UserContentText text={line} as="span" />
            </p>
          ))}
        </div>
        <div className="rounded border border-slate-300 p-3 text-xs">
          <p className="mb-2 font-bold uppercase text-slate-900">Гиранда (харидор)</p>
          {partyRequisiteLines(buyer).map((line) => (
            <p key={line}>
              <UserContentText text={line} as="span" />
            </p>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs">
        Шартномаи хизматрасмонӣ: № <strong>{invoice.contractNumber}</strong> | Мӯҳлати пардохт: {dueDate}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-2 text-left">№</th>
              <th className="border border-slate-300 px-2 py-2 text-left">Номгӯи хизмат</th>
              <th className="border border-slate-300 px-2 py-2 text-left">Ъол.</th>
              <th className="border border-slate-300 px-2 py-2 text-right">Миқдор</th>
              <th className="border border-slate-300 px-2 py-2 text-right">Нарх</th>
              <th className="border border-slate-300 px-2 py-2 text-right">Маблағ</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((line, index) => (
              <tr key={index}>
                <td className="border border-slate-300 px-2 py-2">{index + 1}</td>
                <td className="border border-slate-300 px-2 py-2">
                  <UserContentText text={line.description} as="span" />
                </td>
                <td className="border border-slate-300 px-2 py-2">{line.unit}</td>
                <td className="border border-slate-300 px-2 py-2 text-right">{line.quantity}</td>
                <td className="border border-slate-300 px-2 py-2 text-right">{line.unitPrice}</td>
                <td className="border border-slate-300 px-2 py-2 text-right">{line.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 ml-auto w-full max-w-sm space-y-1 text-xs">
        <p className="flex justify-between gap-4">
          <span>Ҷамъи бе ААИ:</span>
          <strong>{invoice.subtotal}</strong>
        </p>
        {withVat ? (
          <p className="flex justify-between gap-4">
            <span>ААИ ({invoice.vatRate}%):</span>
            <strong>{invoice.vatAmount}</strong>
          </p>
        ) : (
          <p className="flex justify-between gap-4">
            <span>ААИ:</span>
            <strong>0,00</strong>
          </p>
        )}
        <p className="flex justify-between gap-4 border-t border-slate-400 pt-2 text-sm font-bold">
          <span>Ҳамагӣ бо ААИ:</span>
          <span>{invoice.total}</span>
        </p>
      </div>

      <div className="mt-5 space-y-2 text-xs">
        <p>
          <span className="font-semibold">Мақсади пардохт:</span>{' '}
          <UserContentText text={invoice.paymentPurpose} as="span" />
        </p>
        <p>
          <span className="font-semibold">Асоси ҳуқуқӣ:</span>{' '}
          <UserContentText text={invoice.legalBasis} as="span" />
        </p>
        <p className="text-justify italic text-slate-600">{INVOICE_LEGAL_FOOTNOTE}</p>
      </div>

      <OrganizationDocumentSignatureFooter
        director={{ label: directorLabel, name: seller.director || organization?.director }}
        accountant={{
          label: accountantLabel,
          name: organization?.chiefAccountant,
        }}
        sealLabel={t('payrollLedgerSeal')}
      />
    </article>
  );
}
