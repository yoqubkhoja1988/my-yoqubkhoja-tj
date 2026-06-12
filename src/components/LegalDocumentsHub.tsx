'use client';

import { OfficialLegalEntry, officialEntryToSectionItem } from '@/types/official-legal';
import { SectionItem } from '@/types/organization-section';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import LegalDocumentsPanel from './LegalDocumentsPanel';

type LegalApiResponse = {
  laws: OfficialLegalEntry[];
  decisions: OfficialLegalEntry[];
  documents: OfficialLegalEntry[];
};

export default function LegalDocumentsHub() {
  const t = useTranslations();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [laws, setLaws] = useState<SectionItem[]>([]);
  const [decisions, setDecisions] = useState<SectionItem[]>([]);
  const [documents, setDocuments] = useState<SectionItem[]>([]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/official-legal', { credentials: 'same-origin' });
        if (!response.ok) throw new Error('load');

        const data = (await response.json()) as LegalApiResponse;

        if (cancelled) return;

        setLaws(data.laws.map(officialEntryToSectionItem));
        setDecisions(data.decisions.map(officialEntryToSectionItem));
        setDocuments(data.documents.map(officialEntryToSectionItem));
      } catch {
        if (!cancelled) setError(t('legalDocLoadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status, t]);

  if (status === 'loading' || loading) {
    return (
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <p className="text-sm text-[var(--text-muted)]">{t('legalDocLoading')}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <p className="text-sm text-red-300">{error}</p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <p className="page-eyebrow">{t('legalDocHubEyebrow')}</p>
      <h3 className="page-title mt-1 text-lg">{t('legalDocHubTitle')}</h3>
      <p className="page-subtitle mt-1">{t('legalDocHubSubtitle')}</p>

      <div className="mt-4">
        <LegalDocumentsPanel
          sectionType="laws"
          items={[]}
          showTabs
          laws={laws}
          decisions={decisions}
          documents={documents}
        />
      </div>
    </section>
  );
}
