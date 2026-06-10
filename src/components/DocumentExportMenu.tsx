'use client';

import { exportDocument, type ExportFormat } from '@/lib/document-export';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Props = {
  documentId: string;
  filename: string;
  disabled?: boolean;
  customExcelExport?: () => Promise<void>;
};

export default function DocumentExportMenu({
  documentId,
  filename,
  disabled = false,
  customExcelExport,
}: Props) {
  const t = useTranslations();
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await exportDocument({
        documentId,
        format,
        filename,
        customExcelExport,
      });
    } catch (exportError) {
      setError(t('documentExportError'));
      console.error('Document export failed:', exportError);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1">
      <select
        value={format}
        onChange={(event) => setFormat(event.target.value as ExportFormat)}
        className="input-field w-auto text-xs"
        disabled={disabled || exporting}
        aria-label={t('documentExport')}
      >
        <option value="pdf">{t('documentExportPdf')}</option>
        <option value="word">{t('documentExportWord')}</option>
        <option value="excel">{t('documentExportExcel')}</option>
      </select>
      <button
        type="button"
        onClick={() => void handleExport()}
        className="btn-primary text-xs"
        disabled={disabled || exporting}
      >
        {exporting ? t('documentExporting') : `📥 ${t('documentExport')}`}
      </button>
      </div>
      {error && (
        <p className="max-w-xs text-[10px] text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
