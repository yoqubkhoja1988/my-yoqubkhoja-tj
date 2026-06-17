'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import UserContentText from '@/components/UserContentText';
import {
  charterExportFilename,
  downloadCharterCsv,
  downloadCharterExcel,
  downloadCharterJson,
  isCharterImportFile,
  parseCharterFile,
} from '@/lib/charter-document-io';
import { printDocument } from '@/lib/print-document';
import { CharterDocument } from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { ChangeEvent, useRef, useState } from 'react';

type Props = {
  charter: CharterDocument;
  canEdit: boolean;
  editing: boolean;
  disabled?: boolean;
  onCharterChange?: (charter: CharterDocument) => void;
  onImport?: (charter: CharterDocument) => void | Promise<void>;
};

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function CharterDocumentPanel({
  charter,
  canEdit,
  editing,
  disabled = false,
  onCharterChange,
  onImport,
}: Props) {
  const t = useTranslations();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  function updateCharter(patch: Partial<CharterDocument>) {
    onCharterChange?.({ ...charter, ...patch });
  }

  function updateArticle(index: number, patch: Partial<CharterDocument['articles'][number]>) {
    const articles = charter.articles.map((article, articleIndex) =>
      articleIndex === index ? { ...article, ...patch } : article
    );
    onCharterChange?.({ ...charter, articles });
  }

  function addArticle() {
    const nextNumber = String(charter.articles.length + 1);
    onCharterChange?.({
      ...charter,
      articles: [
        ...charter.articles,
        { number: nextNumber, title: '', content: '' },
      ],
    });
  }

  function removeArticle(index: number) {
    onCharterChange?.({
      ...charter,
      articles: charter.articles.filter((_, articleIndex) => articleIndex !== index),
    });
  }

  async function handleImportFile(file: File) {
    if (!isCharterImportFile(file)) {
      setError(t('charterImportInvalidFile'));
      return;
    }

    setImporting(true);
    setError('');

    try {
      const parsed = await parseCharterFile(file);
      if (!parsed) {
        setError(t('charterImportInvalidFile'));
        return;
      }

      const confirmMessage = t('charterImportConfirm', {
        count: parsed.articles.length,
      });
      if (!confirm(confirmMessage)) return;

      if (onImport) {
        await onImport(parsed);
      } else {
        onCharterChange?.(parsed);
      }

      window.alert(t('charterImportSuccess', { count: parsed.articles.length }));
    } catch {
      setError(t('charterImportInvalidFile'));
    } finally {
      setImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  }

  function handleImportInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleImportFile(file);
  }

  function handlePrint() {
    printDocument('charter-document');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('actCharterPrivate')}</p>
          <h4 className="text-sm font-bold">{t('charterDocumentHeading')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('charterDocumentSubtitle')}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-2">
            {canEdit && (
              <>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".json,.csv,.xlsx"
                  className="hidden"
                  onChange={handleImportInputChange}
                />
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  disabled={disabled || importing}
                  className="btn-secondary text-xs"
                >
                  {importing ? '...' : t('importCharter')}
                </button>
              </>
            )}
            <details className="relative">
              <summary className="btn-secondary list-none cursor-pointer text-xs [&::-webkit-details-marker]:hidden">
                {t('exportCharter')} ▾
              </summary>
              <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => downloadCharterJson(charter, charterExportFilename('json'))}
                  disabled={disabled}
                  className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)]"
                >
                  {t('exportCharterJson')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadCharterCsv(charter, charterExportFilename('csv'))}
                  disabled={disabled}
                  className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)]"
                >
                  {t('exportCharterCsv')}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadCharterExcel(charter, charterExportFilename('xlsx'))}
                  disabled={disabled}
                  className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)]"
                >
                  {t('exportCharterExcel')}
                </button>
              </div>
            </details>
            <button type="button" onClick={handlePrint} className="btn-secondary text-xs">
              {t('charterPrint')}
            </button>
            <DocumentExportMenu
              documentId="charter-document"
              filename="charter"
              disabled={disabled}
              customExcelExport={async () => {
                await downloadCharterExcel(charter, charterExportFilename('xlsx'));
              }}
            />
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>
      </div>

      {editing && onCharterChange ? (
        <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/30 p-4 print:hidden">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">{t('charterDocumentTitle')}</span>
            <input
              value={charter.title}
              onChange={(event) => updateCharter({ title: event.target.value })}
              className="input-field text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">{t('charterDocumentDescription')}</span>
            <input
              value={charter.subtitle ?? ''}
              onChange={(event) => updateCharter({ subtitle: event.target.value })}
              className="input-field text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">{t('charterDocumentPreamble')}</span>
            <textarea
              value={charter.preamble}
              onChange={(event) => updateCharter({ preamble: event.target.value })}
              rows={4}
              className="input-field text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">{t('charterDocumentLegalBasis')}</span>
            <textarea
              value={charter.legalBasis.join('\n')}
              onChange={(event) => updateCharter({ legalBasis: splitLines(event.target.value) })}
              rows={4}
              className="input-field text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold">{t('charterDocumentLocation')}</span>
              <input
                value={charter.location ?? ''}
                onChange={(event) => updateCharter({ location: event.target.value })}
                className="input-field text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold">{t('charterDocumentAdoptedAt')}</span>
              <input
                value={charter.adoptedAt ?? ''}
                onChange={(event) => updateCharter({ adoptedAt: event.target.value })}
                className="input-field text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold">{t('charterDocumentApprovedBy')}</span>
              <input
                value={charter.approvedBy ?? ''}
                onChange={(event) => updateCharter({ approvedBy: event.target.value })}
                className="input-field text-sm"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-sm font-bold">{t('charterDocumentArticles')}</h5>
              <button type="button" onClick={addArticle} className="btn-secondary text-xs">
                {t('charterAddArticle')}
              </button>
            </div>
            {charter.articles.map((article, index) => (
              <div
                key={`${article.number}-${index}`}
                className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold">
                    {t('charterArticleNumber')} {article.number}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeArticle(index)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    {t('charterRemoveArticle')}
                  </button>
                </div>
                <input
                  value={article.number}
                  onChange={(event) => updateArticle(index, { number: event.target.value })}
                  className="input-field text-sm"
                  placeholder={t('charterArticleNumber')}
                />
                <input
                  value={article.title}
                  onChange={(event) => updateArticle(index, { title: event.target.value })}
                  className="input-field text-sm"
                  placeholder={t('charterArticleTitle')}
                />
                <textarea
                  value={article.content}
                  onChange={(event) => updateArticle(index, { content: event.target.value })}
                  rows={5}
                  className="input-field text-sm"
                  placeholder={t('charterArticleContent')}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <article
        id="charter-document"
        className="charter-document mx-auto max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-900 shadow-sm print:border-0 print:shadow-none md:p-8"
      >
        <header className="space-y-2 text-center">
          <h3 className="text-base font-bold uppercase tracking-wide">
            <UserContentText text={charter.title} as="span" />
          </h3>
          {charter.subtitle ? (
            <p className="text-xs text-slate-600">
              <UserContentText text={charter.subtitle} as="span" />
            </p>
          ) : null}
        </header>

        <section className="space-y-2">
          <p className="text-justify">
            <UserContentText text={charter.preamble} as="span" />
          </p>
          {charter.legalBasis.length > 0 ? (
            <div>
              <p className="font-semibold">{t('charterDocumentLegalBasis')}:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {charter.legalBasis.map((basis) => (
                  <li key={basis}>
                    <UserContentText text={basis} as="span" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          {charter.articles.map((article) => (
            <div key={`${article.number}-${article.title}`} className="space-y-1">
              <h4 className="font-bold">
                Моддаи {article.number}. {article.title}
              </h4>
              <div className="whitespace-pre-wrap text-justify">
                <UserContentText text={article.content} as="span" />
              </div>
            </div>
          ))}
        </section>

        {(charter.location || charter.adoptedAt || charter.approvedBy) && (
          <footer className="space-y-4 border-t border-slate-200 pt-4 text-sm">
            {charter.location ? (
              <p>
                <UserContentText text={charter.location} as="span" />
              </p>
            ) : null}
            {charter.adoptedAt ? (
              <p>
                {t('charterDocumentAdoptedAt')}: <UserContentText text={charter.adoptedAt} as="span" />
              </p>
            ) : null}
            {charter.approvedBy ? (
              <p className="text-right">
                {t('charterDocumentApprovedBy')}: <UserContentText text={charter.approvedBy} as="span" />
              </p>
            ) : null}
          </footer>
        )}
      </article>
    </div>
  );
}
