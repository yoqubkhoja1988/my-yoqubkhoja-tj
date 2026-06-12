'use client';

import UserContentText from '@/components/UserContentText';
import { getOfficialLegalSource } from '@/lib/official-legal-catalog';
import { SectionItem } from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

type LegalTab = 'laws' | 'decisions' | 'documents' | 'general';

type Props = {
  summary?: string;
  items: SectionItem[];
  sectionType: LegalTab;
  showTabs?: boolean;
  laws?: SectionItem[];
  decisions?: SectionItem[];
  documents?: SectionItem[];
  editing?: boolean;
  onItemsChange?: (items: SectionItem[]) => void;
};

function typeBadgeClass(type?: SectionItem['documentType']): string {
  switch (type) {
    case 'law':
      return 'bg-blue-500/20 text-blue-300';
    case 'decision':
      return 'bg-amber-500/20 text-amber-300';
    case 'document':
      return 'bg-emerald-500/20 text-emerald-300';
    default:
      return 'bg-slate-500/20 text-slate-300';
  }
}

function DocumentCard({ item, t }: { item: SectionItem; t: (key: string) => string }) {
  const source = item.sourceSite ? getOfficialLegalSource(item.sourceSite) : undefined;

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 p-4 transition hover:border-[var(--accent)]/35">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug">
            <UserContentText text={item.title} as="span" />
          </p>
          {item.detail && (
            <p className="mt-1 text-xs font-semibold text-[var(--accent)]">
              <UserContentText text={item.detail} as="span" />
            </p>
          )}
        </div>
        {item.documentType && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${typeBadgeClass(item.documentType)}`}
          >
            {item.documentType === 'law'
              ? t('legalDocTypeLaw')
              : item.documentType === 'decision'
                ? t('legalDocTypeDecision')
                : t('legalDocTypeDocument')}
          </span>
        )}
      </div>

      {item.description && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
          <UserContentText text={item.description} as="span" />
        </p>
      )}

      {item.fields && item.fields.length > 0 && (
        <dl className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
          {item.fields.map((field) => (
            <div key={field.label}>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <UserContentText text={field.label} as="span" />
              </dt>
              <dd className="mt-0.5 text-sm">
                <UserContentText text={field.value} as="span" />
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            {t('legalDocOpenOfficial')} ↗
          </a>
        )}
        {source && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {t('legalDocSource')}: {source.name}
          </span>
        )}
      </div>
    </article>
  );
}

function EditableDocumentCard({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: SectionItem;
  index: number;
  onChange: (index: number, item: SectionItem) => void;
  onRemove: (index: number) => void;
}) {
  const t = useTranslations();
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--text-muted)]">
          {t('legalDocItemNo', { no: index + 1 })}
        </p>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-xs font-semibold text-red-400 hover:text-red-300"
        >
          {t('legalDocRemoveItem')}
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="field-label">{t('legalDocFieldTitle')}</label>
          <input
            type="text"
            value={item.title}
            onChange={(e) => onChange(index, { ...item, title: e.target.value })}
            className="input-field text-sm"
            placeholder={t('legalDocTitlePlaceholder')}
          />
        </div>

        <div>
          <label className="field-label">{t('legalDocFieldDetail')}</label>
          <input
            type="text"
            value={item.detail ?? ''}
            onChange={(e) => onChange(index, { ...item, detail: e.target.value })}
            className="input-field text-sm"
            placeholder={t('legalDocDetailPlaceholder')}
          />
        </div>

        <div>
          <label className="field-label">{t('legalDocFieldDescription')}</label>
          <textarea
            value={item.description ?? ''}
            onChange={(e) => onChange(index, { ...item, description: e.target.value })}
            rows={3}
            className="input-field text-sm"
            placeholder={t('legalDocDescriptionPlaceholder')}
          />
        </div>

        <div>
          <label className="field-label">{t('legalDocFieldUrl')}</label>
          <input
            type="url"
            value={item.url ?? ''}
            onChange={(e) => onChange(index, { ...item, url: e.target.value })}
            className="input-field text-sm"
            placeholder={t('legalDocUrlPlaceholder')}
          />
        </div>
      </div>
    </article>
  );
}

export default function LegalDocumentsPanel({
  summary,
  items,
  sectionType,
  showTabs = false,
  laws = [],
  decisions = [],
  documents = [],
  editing = false,
  onItemsChange,
}: Props) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<LegalTab>(
    sectionType === 'general' ? 'documents' : sectionType
  );
  const [search, setSearch] = useState('');

  const tabs: { key: LegalTab; label: string; count: number }[] = [
    { key: 'laws', label: t('actLaws'), count: laws.length },
    { key: 'decisions', label: t('actGovernmentDecisions'), count: decisions.length },
    { key: 'documents', label: t('actOfficialDocuments'), count: documents.length },
  ];

  const activeItems = useMemo(() => {
    const list = showTabs
      ? activeTab === 'laws'
        ? laws
        : activeTab === 'decisions'
          ? decisions
          : documents
      : items;

    const q = search.trim().toLowerCase();
    if (!q || editing) return list;

    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.detail?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.url?.toLowerCase().includes(q)
    );
  }, [activeTab, decisions, documents, editing, items, laws, search, showTabs]);

  function patchItem(index: number, item: SectionItem) {
    if (!onItemsChange) return;
    const next = [...items];
    next[index] = item;
    onItemsChange(next);
  }

  function removeItem(index: number) {
    if (!onItemsChange) return;
    onItemsChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addItem() {
    if (!onItemsChange) return;
    const documentType =
      sectionType === 'laws'
        ? 'law'
        : sectionType === 'decisions'
          ? 'decision'
          : sectionType === 'documents'
            ? 'document'
            : undefined;
    onItemsChange([...(items ?? []), { title: '', ...(documentType ? { documentType } : {}) }]);
  }

  return (
    <div className="space-y-4">
      {summary && !editing && (
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          <UserContentText text={summary} as="span" />
        </p>
      )}

      {showTabs && !editing && (
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-[var(--accent)] to-indigo-500 text-white shadow-md shadow-blue-500/20'
                  : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {!editing && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('legalDocSearchPlaceholder')}
          className="input-field max-w-md"
        />
      )}

      {editing && onItemsChange && (
        <button type="button" onClick={addItem} className="btn-secondary text-xs">
          + {t('legalDocAddItem')}
        </button>
      )}

      {activeItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <p className="text-[var(--text-muted)]">
            {editing ? t('legalDocEmptyEdit') : t('legalDocEmpty')}
          </p>
        </div>
      ) : editing && onItemsChange ? (
        <div className="grid gap-3">
          {activeItems.map((item, index) => (
            <EditableDocumentCard
              key={`edit-${index}`}
              item={item}
              index={index}
              onChange={patchItem}
              onRemove={removeItem}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {activeItems.map((item) => (
            <DocumentCard key={`${item.title}-${item.url ?? ''}`} item={item} t={t} />
          ))}
        </div>
      )}

      {!editing && <p className="text-[10px] text-[var(--text-muted)]">{t('legalDocOfficialNote')}</p>}
    </div>
  );
}
