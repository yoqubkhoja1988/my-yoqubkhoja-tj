'use client';

import { downloadCsv } from '@/lib/staff-export';
import {
  exportStaffingTablesToCsv,
  filterStaffingTables,
  isStaffingImportFile,
  parseStaffingTablesFromCsv,
  parseStaffingTablesFromExcel,
  staffingExportFilename,
  downloadStaffingTablesExcel,
} from '@/lib/staff-staffing-export';
import { mergeStaffingTables } from '@/lib/staff-staffing-import';
import { SectionTable } from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { ChangeEvent, useRef, useState } from 'react';

type Props = {
  tables: SectionTable[];
  canEdit: boolean;
  disabled?: boolean;
  onImport: (tables: SectionTable[]) => void | Promise<void>;
};

export default function StaffStaffingImportExport({
  tables,
  canEdit,
  disabled = false,
  onImport,
}: Props) {
  const t = useTranslations();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const staffingTables = filterStaffingTables(tables);
  const hasTables = staffingTables.length > 0;

  function handleExportCsv() {
    const csv = exportStaffingTablesToCsv(staffingTables);
    downloadCsv(staffingExportFilename('csv'), csv);
  }

  async function handleExportExcel() {
    await downloadStaffingTablesExcel(
      staffingTables,
      staffingExportFilename('xlsx'),
      t('staffScheduleTitle')
    );
  }

  async function handleImportFile(file: File) {
    if (!isStaffingImportFile(file)) {
      setError(t('staffingImportInvalidFile'));
      return;
    }

    setImporting(true);
    setError('');

    try {
      const lowerName = file.name.toLowerCase();
      const parsed =
        lowerName.endsWith('.csv')
          ? parseStaffingTablesFromCsv(await file.text())
          : await parseStaffingTablesFromExcel(await file.arrayBuffer());

      if (parsed.length === 0) {
        setError(t('staffingImportNoTables'));
        return;
      }

      const mergeResult = mergeStaffingTables(tables, parsed);
      const confirmMessage = t('staffingImportConfirm', {
        count: parsed.length,
        added: mergeResult.added,
        updated: mergeResult.updated,
      });
      if (!confirm(confirmMessage)) return;

      await onImport(mergeResult.tables);
      window.alert(
        t('staffingImportSuccess', {
          added: mergeResult.added,
          updated: mergeResult.updated,
        })
      );
    } catch {
      setError(t('staffingImportInvalidFile'));
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

  if (!hasTables && !canEdit) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {canEdit && (
          <>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleImportInputChange}
            />
            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              disabled={disabled || importing}
              className="btn-secondary"
            >
              {importing ? '...' : t('importStaffingTables')}
            </button>
          </>
        )}
        <details className="relative">
          <summary
            className={`btn-secondary list-none cursor-pointer [&::-webkit-details-marker]:hidden ${
              !hasTables ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {t('exportStaffingTables')} ▾
          </summary>
          <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1 shadow-lg">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!hasTables || disabled}
              className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)]"
            >
              {t('exportStaffingTablesCsv')}
            </button>
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={!hasTables || disabled}
              className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)]"
            >
              {t('exportStaffingTablesExcel')}
            </button>
          </div>
        </details>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
