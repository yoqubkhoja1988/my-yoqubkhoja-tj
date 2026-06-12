import { SectionItem } from '@/types/organization-section';

export type OfficialDocumentType = 'law' | 'decision' | 'document';

export interface OfficialLegalSource {
  id: string;
  name: string;
  baseUrl: string;
}

export interface OfficialLegalEntry {
  id: string;
  type: OfficialDocumentType;
  title: string;
  detail?: string;
  description?: string;
  officialUrl: string;
  sourceId: string;
  officialNumber?: string;
  adoptedAt?: string;
  status?: string;
  fields?: { label: string; value: string }[];
}

export interface OfficialLegalBundle {
  laws: OfficialLegalEntry[];
  decisions: OfficialLegalEntry[];
  documents: OfficialLegalEntry[];
}

export function officialEntryToSectionItem(entry: OfficialLegalEntry): SectionItem {
  const fields = [
    ...(entry.officialNumber
      ? [{ label: 'Рақам', value: entry.officialNumber }]
      : []),
    ...(entry.adoptedAt ? [{ label: 'Сана', value: entry.adoptedAt }] : []),
    ...(entry.status ? [{ label: 'Ҳолат', value: entry.status }] : []),
    ...(entry.fields ?? []),
  ];

  return {
    title: entry.title,
    detail: entry.detail,
    description: entry.description,
    url: entry.officialUrl,
    sourceSite: entry.sourceId,
    documentType: entry.type,
    officialNumber: entry.officialNumber,
    adoptedAt: entry.adoptedAt,
    status: entry.status,
    fields: fields.length > 0 ? fields : undefined,
  };
}
