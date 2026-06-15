import { join } from 'path';

const DOCS_DIR = join(process.cwd(), 'private', 'admin-docs');

export type AdminInternalDoc = {
  slug: string;
  titleKey: string;
  file: string;
  format: 'pdf' | 'html';
};

export const ADMIN_INTERNAL_DOCS: AdminInternalDoc[] = [
  {
    slug: 'shartnoma-pdf',
    titleKey: 'adminDocsContractPdf',
    file: 'pdf/shartnomai-hizmatrasoni-utoqi-shakhsi.pdf',
    format: 'pdf',
  },
  {
    slug: 'narknoma-pdf',
    titleKey: 'adminDocsPricePdf',
    file: 'pdf/narknomai-utoqi-shakhsi.pdf',
    format: 'pdf',
  },
  {
    slug: 'shartnoma-html',
    titleKey: 'adminDocsContractHtml',
    file: 'shartnomai-hizmatrasoni-utoqi-shakhsi.html',
    format: 'html',
  },
  {
    slug: 'narknoma-html',
    titleKey: 'adminDocsPriceHtml',
    file: 'narknomai-utoqi-shakhsi.html',
    format: 'html',
  },
  {
    slug: 'utoki-guide',
    titleKey: 'adminDocsUtoqGuide',
    file: 'dasturamali-utoki-shakhsi.html',
    format: 'html',
  },
];

export function getAdminDocBySlug(slug: string): AdminInternalDoc | undefined {
  return ADMIN_INTERNAL_DOCS.find((doc) => doc.slug === slug);
}

export function getAdminDocPath(relativeFile: string): string {
  const normalized = relativeFile.replace(/\\/g, '/');
  if (normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid path');
  }
  return join(DOCS_DIR, normalized);
}
