import { DocumentSignatureSlot } from '@/lib/organization-document-signatures';

type Props = {
  director: DocumentSignatureSlot;
  accountant: DocumentSignatureSlot;
  sealLabel: string;
  className?: string;
  leadingRows?: DocumentSignatureSlot[][];
  extraRows?: DocumentSignatureSlot[][];
};

function SignatureColumn({ label, name }: DocumentSignatureSlot) {
  return (
    <div>
      <p className="font-semibold">{label}</p>
      <p className="mt-6 border-t border-slate-400 pt-1">
        {name?.trim() || '________________'}
      </p>
    </div>
  );
}

function SealColumn({ label }: { label: string }) {
  return (
    <div className="flex flex-col">
      <p className="font-semibold md:text-center">{label}</p>
      <div className="mt-4 flex justify-start md:justify-center">
        <div
          className="document-signature-seal flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-300"
          aria-hidden
        />
      </div>
    </div>
  );
}

function SignatureRow({
  row,
  rowIndex,
  prefix,
}: {
  row: DocumentSignatureSlot[];
  rowIndex: number;
  prefix: string;
}) {
  return (
    <div
      key={`${prefix}-${rowIndex}`}
      className={`document-signature-footer mt-8 grid gap-8 text-xs text-slate-700 ${
        row.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
      }`}
    >
      {row.map((slot, columnIndex) => (
        <SignatureColumn key={`${prefix}-${rowIndex}-${columnIndex}`} {...slot} />
      ))}
    </div>
  );
}

export default function OrganizationDocumentSignatureFooter({
  director,
  accountant,
  sealLabel,
  className = '',
  leadingRows = [],
  extraRows = [],
}: Props) {
  return (
    <div className={className}>
      {leadingRows.map((row, rowIndex) => (
        <SignatureRow key={`leading-${rowIndex}`} row={row} rowIndex={rowIndex} prefix="leading" />
      ))}

      <div className="document-signature-footer mt-10 grid gap-8 text-xs text-slate-700 md:grid-cols-3">
        <SignatureColumn {...director} />
        <SignatureColumn {...accountant} />
        <SealColumn label={sealLabel} />
      </div>

      {extraRows.map((row, rowIndex) => (
        <SignatureRow key={`extra-${rowIndex}`} row={row} rowIndex={rowIndex} prefix="extra" />
      ))}
    </div>
  );
}
