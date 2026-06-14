'use client';

import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import UserContentText from '@/components/UserContentText';
import { formatAppDate } from '@/lib/intl-locale';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import {
  CONTRACT_LEGAL_FOOTNOTE,
  contractAmountBreakdown,
  contractValidityText,
  counterpartyPartyRequisites,
  organizationPartyRequisites,
  partyRequisiteLines,
} from '@/lib/org-service-contract-documents';
import { Organization } from '@/types/organization';
import {
  ContractCounterparty,
  OrganizationServiceContract,
} from '@/types/organization-section';
import { useLocale } from 'next-intl';

type Props = {
  organizationId: string;
  organizationName: string;
  organization?: Organization;
  contract: OrganizationServiceContract;
  counterparty?: ContractCounterparty;
};

function PartyBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded border border-slate-300 p-3 leading-relaxed text-slate-800">
      <p className="mb-2 font-bold uppercase text-slate-900">{title}</p>
      {lines.map((line) => (
        <p key={line}>
          <UserContentText text={line} as="span" />
        </p>
      ))}
    </div>
  );
}

export default function OrganizationServiceContractDocument({
  organizationId,
  organizationName,
  organization,
  contract,
  counterparty,
}: Props) {
  const locale = useLocale();
  const preparedAt = formatAppDate(contract.preparedAt, locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const provider = organizationPartyRequisites(organizationName, organization);
  const customer = counterpartyPartyRequisites(counterparty);
  const amounts = contractAmountBreakdown(contract);
  const paymentTerms = contract.paymentTerms.trim();
  const directorLabel = getDirectorSignatureLabel(organizationId);

  return (
    <article className="org-legal-document rounded-xl border border-[var(--border)] bg-white p-5 md:p-8">
      <OrganizationReportDocumentHeader variant="document" className="mb-6" />

      <h1 className="text-center font-bold uppercase">
        ШАРТНОМАИ ХИЗМАТРАСМОНӢ № {contract.contractNumber}
      </h1>
      <p className="mt-4 flex justify-between">
        <span>Шаҳри Душанбе</span>
        <span>«{preparedAt}»</span>
      </p>

      <p className="mt-6 text-justify">
        <strong>{provider.name}</strong> (минбаъд «Иҷрокунанда»), дар шахси{' '}
        {provider.director || '________________'}, аз як тараф, ва{' '}
        <strong>{customer.name || contract.counterpartyName}</strong> (минбаъд «Фармоишгар»), дар шахси{' '}
        {customer.director || '________________'}, аз тарафи дигар, ки дар ин шартнома «Тарафҳо» номида
        мешаванд, мувофиқи қонунгузории амалкунандаи Ҷумҳурии Тоҷикистон шартномаи зеринро ба имзо
        расониданд:
      </p>

      <section className="mt-5 space-y-2">
        <h2 className="font-bold uppercase">1. Мавзӯи шартнома</h2>
        <p className="text-justify">
          1.1. Иҷрокунанда уҳдадор мешавад, ки хизматрасониҳои зеринро анҷом диҳад, ва Фармоишгар уҳдадор
          мешавад, ки барои хизматрасониҳои қабулшуда пардохт намояд:{' '}
          <UserContentText text={contract.subject} as="span" />.
        </p>
        <p className="text-justify">
          1.2. Тавсифи хизматрасониҳо:{' '}
          <UserContentText text={contract.servicesDescription} as="span" />.
        </p>
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="font-bold uppercase">2. Нарх ва тартиби пардохт</h2>
        <p>
          2.1. Маблағи умумии хизматрасониҳо: <strong>{amounts.subtotal}</strong> сомонӣ (TJS), бе ААИ.
        </p>
        {contract.vatApplicable ? (
          <p>
            2.2. ААИ ({contract.vatRate}%): <strong>{amounts.vatAmount}</strong> сомонӣ. Ҳамагӣ бо ААИ:{' '}
            <strong>{amounts.total}</strong> сомонӣ, мувофиқи Кодекси андози Ҷумҳурии Тоҷикистон.
          </p>
        ) : (
          <p>2.2. ААИ ба хизматрасониҳои зикршуда татбиқ намешавад.</p>
        )}
        <p className="text-justify">
          2.3. Тартиби пардохт:{' '}
          <UserContentText text={paymentTerms || '—'} as="span" />.
        </p>
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="font-bold uppercase">3. Мӯҳлати амалкунӣ</h2>
        <p>
          3.1. Шартнома {contractValidityText(contract)} амал мекунад ва то иҷрои пурраи уҳдадориҳои
          Тарафҳо эътибор дорад.
        </p>
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="font-bold uppercase">4. Ҳуқуқ ва уҳдадориҳои тарафҳо</h2>
        <p className="text-justify">
          4.1. Иҷрокунанда хизматрасониҳоро бо сифати баланд ва дар мӯҳлати муқарраршуда анҷом медиҳад.
        </p>
        <p className="text-justify">
          4.2. Фармоишгар хизматрасониҳои қабулшударо тасдиқ намуда, пардохтро мувофиқи шартҳои ин
          шартнома анҷом медиҳад.
        </p>
        <p className="text-justify">
          4.3. Тарафҳо барои иҷрои уҳдадориҳои шартномавӣ мувофиқи қонунгузории Ҷумҳурии Тоҷикистон
          ҷавобгар мебошанд.
        </p>
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="font-bold uppercase">5. Ҳалли ихтилофот</h2>
        <p className="text-justify">
          5.1. Ихтилофот бо роҳи музокира ҳал карда мешавад. Дар сурати ба ҳал наёфтан, ихтилофот ба
          суди махсуси Ҷумҳурии Тоҷикистон мувофиқи қонунгузории амалкунанда супурда мешавад.
        </p>
      </section>

      <section className="mt-5 space-y-2">
        <h2 className="font-bold uppercase">6. Тартиби дигар</h2>
        <p className="text-justify">
          6.1. Асоси ҳуқуқӣ: <UserContentText text={contract.legalBasis} as="span" />.
        </p>
        <p className="text-justify">
          6.2. Шартнома дар ду нусхаи ҳамсон ва қувваи як хел тартиб дода шуда, як нусха барои ҳар як
          Тараф дода мешавад.
        </p>
        <p className="mt-3 text-justify text-[11pt] italic text-slate-600">{CONTRACT_LEGAL_FOOTNOTE}</p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <PartyBlock title="Иҷрокунанда" lines={partyRequisiteLines(provider)} />
        <PartyBlock
          title="Фармоишгар"
          lines={partyRequisiteLines({ ...customer, name: customer.name || contract.counterpartyName })}
        />
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <p className="font-semibold">{directorLabel}и Иҷрокунанда</p>
          <p className="mt-8 border-t border-slate-400 pt-1">
            {provider.director || '________________'} / имзо
          </p>
        </div>
        <div>
          <p className="font-semibold">Роҳбари Фармоишгар</p>
          <p className="mt-8 border-t border-slate-400 pt-1">
            {customer.director || '________________'} / имзо
          </p>
        </div>
      </div>
    </article>
  );
}
