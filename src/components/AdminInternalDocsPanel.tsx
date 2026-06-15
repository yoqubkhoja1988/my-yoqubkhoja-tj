'use client';

import { ADMIN_INTERNAL_DOCS } from '@/lib/admin-internal-docs';
import { useTranslations } from 'next-intl';

const FORMAT_BADGE_CLASS: Record<'pdf' | 'html', string> = {
  pdf: 'bg-red-500/15 text-red-300',
  html: 'bg-sky-500/15 text-sky-300',
};

export default function AdminInternalDocsPanel() {
  const t = useTranslations();

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          {t('adminDocsEyebrow')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-[var(--text)]">{t('adminDocsTitle')}</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{t('adminDocsSubtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ADMIN_INTERNAL_DOCS.map((doc) => (
          <a
            key={doc.slug}
            href={`/api/admin/docs/${doc.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--accent)]"
          >
            <div className="min-w-0">
              <p className="font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                {t(doc.titleKey)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t('adminDocsOpenHint')}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${FORMAT_BADGE_CLASS[doc.format]}`}
            >
              {doc.format === 'pdf' ? t('adminDocsFormatPdf') : t('adminDocsFormatHtml')}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
