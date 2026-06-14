'use client';

import {
  fetchOrganizationSection,
  updateOrganizationSection,
} from '@/lib/organization-sections';
import {
  detectStaffColumns,
  formatStaffCount,
  isAutoCalculatedCell,
  isStaffCell,
  isTotalRow,
  parseStaffCount,
  recalculateAllStaffTables,
} from '@/lib/staff-table-calc';
import {
  OrganizationSectionContent,
  SectionItem,
  SectionTable,
  VacancyNoticeInfo,
} from '@/types/organization-section';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { analyzeFinance } from '@/lib/finance-analytics';
import { analyzeStaffing } from '@/lib/staff-analytics';
import { Organization } from '@/types/organization';
import FinanceBudgetPanel from './FinanceBudgetPanel';
import FinanceOverviewStats from './FinanceOverviewStats';
import FinancePayrollLedgerPanel from './FinancePayrollLedgerPanel';
import FinanceBankPaymentPanel from './FinanceBankPaymentPanel';
import FinancePayrollPanel from './FinancePayrollPanel';
import FinanceLaborLeavePanel from './FinanceLaborLeavePanel';
import FinanceMaternityLeavePanel from './FinanceMaternityLeavePanel';
import FinanceSickLeavePanel from './FinanceSickLeavePanel';
import FinancePositionHandoverPanel from './FinancePositionHandoverPanel';
import FinanceFuneralAllowancePanel from './FinanceFuneralAllowancePanel';
import OrganizationContractsPanel from './OrganizationContractsPanel';
import FinanceReportsPanel from './FinanceReportsPanel';
import FinanceSectionNav from './FinanceSectionNav';
import {
  DEFAULT_FINANCE_SECTION,
  FinanceSectionId,
  isFinanceSectionId,
} from '@/lib/finance-section-nav';
import {
  DEFAULT_STAFF_SECTION,
  StaffSectionId,
  isStaffSectionId,
} from '@/lib/staff-section-nav';
import StaffEmployeeRegistry from './StaffEmployeeRegistry';
import StaffTimesheetPanel from './StaffTimesheetPanel';
import StaffOverviewStats from './StaffOverviewStats';
import StaffSectionNav from './StaffSectionNav';
import StaffFormationReportPanel from './StaffFormationReportPanel';
import StaffVacancyPanel from './StaffVacancyPanel';
import OrganizationInfoPanel from './OrganizationInfoPanel';
import UserContentText from './UserContentText';
import LegalDocumentsPanel from './LegalDocumentsPanel';
import { LEGAL_SECTION_SLUGS } from '@/lib/official-legal-catalog';
import { ensureForm5Tables, form5TablesFromAll } from '@/lib/financial-report-form5';
import {
  isFinancialReportSection,
  resolveFinancialReportStorageSlug,
  resolveFinancialReportView,
} from '@/lib/financial-reports-menu';
import {
  ORG_INFO_DEFAULT_SUMMARY,
  ORG_INFO_SECTION_SLUG,
} from '@/lib/organization-info';
import { isCharterLegalSection, LIST_OF_ENTERPRISES_SECTION_SLUG } from '@/lib/user-access';
import { ORGANIZATION_CONTRACTS_SECTION_SLUG } from '@/lib/org-service-contracts';

function cloneContent(content: OrganizationSectionContent): OrganizationSectionContent {
  return JSON.parse(JSON.stringify(content)) as OrganizationSectionContent;
}

function DataTableView({ table }: { table: SectionTable }) {
  return (
    <div className="table-wrapper">
      <table>
        <caption>
          <UserContentText text={table.title} as="span" />
          {table.caption && (
            <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]">
              <UserContentText text={table.caption} as="span" />
            </span>
          )}
        </caption>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column}>
                <UserContentText text={column} as="span" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>
                  <UserContentText text={cell} as="span" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  organizationId: string;
  organizationName: string;
  organization?: Organization;
  section: string;
  content: OrganizationSectionContent;
  staffContent?: OrganizationSectionContent | null;
  canEdit?: boolean;
};

export default function EditableSectionContent({
  organizationId,
  organizationName,
  organization,
  section,
  content,
  staffContent,
  canEdit = false,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [data, setData] = useState(content);
  const [liveStaffContent, setLiveStaffContent] = useState(staffContent ?? null);
  const [payrollLedgerMonth, setPayrollLedgerMonth] = useState<string | null>(null);
  const [activeFinanceSection, setActiveFinanceSection] =
    useState<FinanceSectionId>(DEFAULT_FINANCE_SECTION);
  const [activeStaffSection, setActiveStaffSection] =
    useState<StaffSectionId>(DEFAULT_STAFF_SECTION);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrganizationSectionContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(content);
  }, [content]);

  useEffect(() => {
    setLiveStaffContent(staffContent ?? null);
  }, [staffContent]);

  useEffect(() => {
    if (section !== 'finance') return;

    function syncFinanceHash() {
      const hash = window.location.hash.slice(1);
      if (isFinanceSectionId(hash)) {
        setActiveFinanceSection(hash);
      }
    }

    syncFinanceHash();
    window.addEventListener('hashchange', syncFinanceHash);
    return () => window.removeEventListener('hashchange', syncFinanceHash);
  }, [section]);

  useEffect(() => {
    if (section !== 'staff') return;

    function syncStaffHash() {
      const hash = window.location.hash.slice(1);
      if (isStaffSectionId(hash)) {
        setActiveStaffSection(hash);
      }
    }

    syncStaffHash();
    window.addEventListener('hashchange', syncStaffHash);
    return () => window.removeEventListener('hashchange', syncStaffHash);
  }, [section]);

  function selectFinanceSection(id: FinanceSectionId) {
    setActiveFinanceSection(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  function selectStaffSection(id: StaffSectionId) {
    setActiveStaffSection(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  function addBudgetTables() {
    if (!draft) return;
    const tables = [...(draft.tables ?? [])];
    tables.push({
      title: t('financeBudgetTableAnnual'),
      columns: [
        t('financeBudgetColArticle'),
        t('financeBudgetColPlanned'),
        t('financeBudgetColExecuted'),
      ],
      rows: [
        [t('financeBudgetRowPayroll'), '0,00', '0,00'],
        [t('financeBudgetRowOperations'), '0,00', '0,00'],
        [t('financeBudgetRowTotal'), '0,00', '0,00'],
      ],
    });
    tables.push({
      title: t('financeBudgetTableQuarterly'),
      columns: [
        t('financeBudgetColPeriod'),
        t('financeBudgetColPlanned'),
        t('financeBudgetColExecuted'),
      ],
      rows: [
        ['I', '0,00', '0,00'],
        ['II', '0,00', '0,00'],
        ['III', '0,00', '0,00'],
        ['IV', '0,00', '0,00'],
      ],
    });
    setDraft({ ...draft, tables });
  }

  function addStaffScheduleTable() {
    if (!draft) return;
    const tables = [...(draft.tables ?? [])];
    tables.push({
      title: t('staffScheduleNewTableTitle'),
      columns: [
        t('staffColNo'),
        t('staffColPosition'),
        t('staffColQuota'),
        t('staffColBaseSalary'),
        t('staffColHarmfulPercent'),
        t('staffColHarmfulAmount'),
        t('staffColMonthlyWage'),
      ],
      rows: [['1', '', '0', '0,00', '', '', '0,00']],
    });
    setDraft({ ...draft, tables: recalculateAllStaffTables(tables) });
  }

  useEffect(() => {
    if (section !== 'finance') return;

    let cancelled = false;

    async function refreshFinanceData() {
      const [staff, finance] = await Promise.all([
        fetchOrganizationSection(organizationId, 'staff'),
        fetchOrganizationSection(organizationId, 'finance'),
      ]);
      if (cancelled) return;
      if (staff) setLiveStaffContent(staff);
      if (finance) setData(finance);
    }

    void refreshFinanceData();

    function onFocus() {
      void refreshFinanceData();
    }
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [section, organizationId]);

  function applyStaffCalculations(source: OrganizationSectionContent): OrganizationSectionContent {
    if (!source.tables) return source;
    return {
      ...source,
      tables: recalculateAllStaffTables(source.tables),
    };
  }

  function startEdit() {
    setDraft(applyStaffCalculations(cloneContent(data)));
    setEditing(true);
    setError('');
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
    setError('');
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError('');

    const payload = applyStaffCalculations({
      ...draft,
      summary:
        section === ORG_INFO_SECTION_SLUG
          ? draft.summary?.trim() || ORG_INFO_DEFAULT_SUMMARY
          : draft.summary,
      employees: draft.employees ?? data.employees,
      vacancyNotice: draft.vacancyNotice ?? data.vacancyNotice,
      timesheets: draft.timesheets ?? data.timesheets,
      reportHeader: draft.reportHeader ?? data.reportHeader,
    });
    const storageSlug = resolveFinancialReportStorageSlug(section);
    const saved = await updateOrganizationSection(organizationId, storageSlug, payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    setData(applyStaffCalculations(saved));
    setDraft(null);
    setEditing(false);
    if (section === ORG_INFO_SECTION_SLUG) {
      router.refresh();
    }
  }

  function updateCell(tableIndex: number, rowIndex: number, cellIndex: number, value: string) {
    if (!draft?.tables) return;
    const tables = [...draft.tables];
    const table = tables[tableIndex];
    const rows = table.rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === cellIndex ? value : cell)) : [...row]
    );
    tables[tableIndex] = { ...table, rows };
    setDraft({ ...draft, tables: recalculateAllStaffTables(tables) });
  }

  function adjustStaff(tableIndex: number, rowIndex: number, delta: number) {
    if (!draft?.tables) return;
    const columns = detectStaffColumns(draft.tables[tableIndex].columns);
    if (!columns) return;

    const row = draft.tables[tableIndex].rows[rowIndex];
    if (isTotalRow(row, columns.position)) return;

    const current = parseStaffCount(row[columns.staff]) ?? 0;
    updateCell(tableIndex, rowIndex, columns.staff, formatStaffCount(current + delta));
  }

  function updateTableMeta(
    tableIndex: number,
    field: 'title' | 'caption',
    value: string
  ) {
    if (!draft?.tables) return;
    const tables = [...draft.tables];
    tables[tableIndex] = { ...tables[tableIndex], [field]: value };
    setDraft({ ...draft, tables });
  }

  const displayData = useMemo(() => applyStaffCalculations(data), [data]);
  const view = editing && draft ? draft : displayData;
  const staffAnalytics = useMemo(() => {
    if (section === 'staff') return analyzeStaffing(displayData);
    if (section === 'formation-report' && liveStaffContent) {
      return analyzeStaffing(liveStaffContent);
    }
    return null;
  }, [section, displayData, liveStaffContent]);
  const financeAnalytics = useMemo(
    () =>
      section === 'finance' ? analyzeFinance(displayData, liveStaffContent) : null,
    [section, displayData, liveStaffContent]
  );

  function addStaffingRow(tableIndex: number) {
    if (!draft?.tables) return;
    const table = draft.tables[tableIndex];
    const columns = detectStaffColumns(table.columns);
    if (!columns) return;

    const dataRowCount = table.rows.filter(
      (row) => !isTotalRow(row, columns.position)
    ).length;
    const newRow = table.columns.map((_, cellIndex) => {
      if (cellIndex === 0) return String(dataRowCount + 1);
      if (cellIndex === columns.position) return '';
      if (cellIndex === columns.staff) return '1';
      if (cellIndex === columns.baseSalary) return '0,00';
      if (cellIndex === columns.harmfulPercent) return '—';
      return '';
    });

    const totalRowIndex = table.rows.findIndex((row) =>
      isTotalRow(row, columns.position)
    );
    const rows = [...table.rows];
    if (totalRowIndex >= 0) rows.splice(totalRowIndex, 0, newRow);
    else rows.push(newRow);

    const tables = [...draft.tables];
    tables[tableIndex] = { ...table, rows };
    setDraft({ ...draft, tables: recalculateAllStaffTables(tables) });
  }

  function resolveLegalSectionType():
    | 'laws'
    | 'decisions'
    | 'documents'
    | 'general' {
    if (section === LEGAL_SECTION_SLUGS.laws) return 'laws';
    if (section === LEGAL_SECTION_SLUGS.decisions) return 'decisions';
    if (section === LEGAL_SECTION_SLUGS.documents) return 'documents';
    return 'general';
  }

  function updateDraftItems(items: SectionItem[]) {
    if (!draft) return;
    setDraft({ ...draft, items });
  }

  function initForm5InDraft() {
    if (!draft) return;
    setDraft({ ...draft, tables: ensureForm5Tables(draft.tables) });
  }

  function updateForm5Cell(
    form5TableIndex: number,
    rowIndex: number,
    cellIndex: number,
    value: string
  ) {
    if (!draft?.tables) return;
    const form5Tables = form5TablesFromAll(draft.tables);
    const targetTitle = form5Tables[form5TableIndex]?.title;
    if (!targetTitle) return;

    const tableIndex = draft.tables.findIndex((table) => table.title === targetTitle);
    if (tableIndex < 0) return;

    const tables = [...draft.tables];
    const table = tables[tableIndex];
    const rows = table.rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === cellIndex ? value : cell)) : [...row]
    );
    tables[tableIndex] = { ...table, rows };
    setDraft({ ...draft, tables });
  }

  function addForm5Row(form5TableIndex: number) {
    if (!draft?.tables) return;
    const form5Tables = form5TablesFromAll(draft.tables);
    const targetTitle = form5Tables[form5TableIndex]?.title;
    if (!targetTitle) return;

    const tableIndex = draft.tables.findIndex((table) => table.title === targetTitle);
    if (tableIndex < 0) return;

    const table = draft.tables[tableIndex];
    const emptyRow = table.columns.map((_, cellIndex) => (cellIndex < 2 ? '' : '0,00'));
    const tables = [...draft.tables];
    tables[tableIndex] = { ...table, rows: [...table.rows, emptyRow] };
    setDraft({ ...draft, tables });
  }

  function removeStaffingRow(tableIndex: number, rowIndex: number) {
    if (!draft?.tables) return;
    const table = draft.tables[tableIndex];
    const columns = detectStaffColumns(table.columns);
    if (!columns) return;
    if (isTotalRow(table.rows[rowIndex], columns.position)) return;

    const dataRows = table.rows.filter((row) => !isTotalRow(row, columns.position));
    if (dataRows.length <= 1) return;

    const tables = [...draft.tables];
    tables[tableIndex] = {
      ...table,
      rows: table.rows.filter((_, index) => index !== rowIndex),
    };
    setDraft({ ...draft, tables: recalculateAllStaffTables(tables) });
  }

  return (
    <div className="space-y-4">
      {section === 'staff' && staffAnalytics && (
        <StaffSectionNav
          activeId={activeStaffSection}
          onSelect={selectStaffSection}
        />
      )}

      {section === 'finance' && financeAnalytics && (
        <FinanceSectionNav
          activeId={activeFinanceSection}
          onSelect={selectFinanceSection}
        />
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canEdit && (
          !editing ? (
            <button type="button" onClick={startEdit} className="btn-secondary">
              {t('editSection')}
            </button>
          ) : (
            <>
              <button type="button" onClick={cancelEdit} className="btn-secondary" disabled={saving}>
                {t('cancel')}
              </button>
              <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? '...' : t('save')}
              </button>
            </>
          )
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {((section !== 'finance' &&
        section !== 'staff' &&
        section !== ORG_INFO_SECTION_SLUG &&
        section !== ORGANIZATION_CONTRACTS_SECTION_SLUG &&
        !isFinancialReportSection(section) &&
        !isCharterLegalSection(section)) ||
        (section === 'finance' &&
          (activeFinanceSection === 'finance-stats' ||
            activeFinanceSection === 'finance-budget')) ||
        (section === 'staff' &&
          (activeStaffSection === 'staff-stats' ||
            activeStaffSection === 'staff-schedule'))) && (
        <>
          {editing && draft ? (
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={4}
              className="input-field text-sm"
            />
          ) : (
            <p className="text-xs leading-relaxed text-[var(--text-muted)] md:text-sm">
              <UserContentText text={view.summary} as="span" />
            </p>
          )}
        </>
      )}

      {section === 'finance' && financeAnalytics && activeFinanceSection === 'finance-stats' && (
        <FinanceOverviewStats analytics={financeAnalytics} />
      )}

      {section === 'finance' && financeAnalytics && activeFinanceSection === 'finance-budget' && (
        <FinanceBudgetPanel
          analytics={financeAnalytics}
          editing={editing}
          onAddBudgetTables={addBudgetTables}
        />
      )}

      {section === 'staff' && staffAnalytics && activeStaffSection === 'staff-stats' && (
        <StaffOverviewStats analytics={staffAnalytics} />
      )}

      {section === 'staff' &&
        activeStaffSection === 'staff-schedule' &&
        (!view.tables || view.tables.length === 0) && (
          <div className="space-y-4">
            <div>
              <p className="page-eyebrow">{t('staffNavSchedule')}</p>
              <h4 className="text-sm font-bold">{t('staffScheduleTitle')}</h4>
            </div>
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-input)]/30 p-4 text-sm text-[var(--text-muted)]">
              <p>{t('staffScheduleEmpty')}</p>
              {editing && (
                <button
                  type="button"
                  onClick={addStaffScheduleTable}
                  className="btn-secondary mt-3 text-xs"
                >
                  + {t('staffScheduleAddTable')}
                </button>
              )}
            </div>
          </div>
        )}

      {section === 'staff' && staffAnalytics && activeStaffSection === 'staff-vacancy' && (
        <StaffVacancyPanel
          organizationName={organizationName}
          analytics={staffAnalytics}
          vacancyNotice={editing && draft ? draft.vacancyNotice : view.vacancyNotice}
          editing={editing}
          onNoticeChange={(notice: VacancyNoticeInfo) => {
            if (!draft) return;
            setDraft({ ...draft, vacancyNotice: notice });
          }}
        />
      )}

      {section === 'formation-report' && (
        <StaffFormationReportPanel analytics={staffAnalytics} />
      )}

      {section === ORG_INFO_SECTION_SLUG && (
        <OrganizationInfoPanel
          organizationName={organizationName}
          reportHeader={editing && draft ? draft.reportHeader : view.reportHeader}
          editing={editing && !!draft}
          onChange={
            editing && draft
              ? (reportHeader) => setDraft({ ...draft, reportHeader })
              : undefined
          }
        />
      )}

      {section === ORGANIZATION_CONTRACTS_SECTION_SLUG && (
        <OrganizationContractsPanel
          organizationId={organizationId}
          organization={organization}
          content={displayData}
          onUpdate={setData}
        />
      )}

      {isFinancialReportSection(section) && (
        <>
          {editing && draft ? (
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={3}
              className="input-field text-sm"
              placeholder={t('financeReportsDefaultSummary')}
            />
          ) : null}
          <FinanceReportsPanel
            view={resolveFinancialReportView(section)}
            summary={view.summary}
            items={view.items ?? []}
            tables={view.tables ?? []}
            editing={editing && !!draft}
            onItemsChange={editing && draft ? updateDraftItems : undefined}
            onForm5CellChange={editing && draft ? updateForm5Cell : undefined}
            onForm5AddRow={editing && draft ? addForm5Row : undefined}
            onInitForm5={editing && draft ? initForm5InDraft : undefined}
          />
        </>
      )}

      {view.tables &&
        view.tables.length > 0 &&
        ((section === 'staff' && activeStaffSection === 'staff-schedule') ||
          (section === 'finance' && activeFinanceSection === 'finance-budget')) && (
        <div
          id={section === 'staff' ? 'staff-schedule' : undefined}
          className="space-y-4"
        >
          {section === 'staff' && (
            <div>
              <p className="page-eyebrow">{t('staffNavSchedule')}</p>
              <h4 className="text-sm font-bold">{t('staffScheduleTitle')}</h4>
            </div>
          )}
          {section === 'finance' && (
            <div>
              <h5 className="text-sm font-bold">{t('financeBudgetSourceTables')}</h5>
            </div>
          )}
          {view.tables.map((table, tableIndex) =>
            editing && draft?.tables ? (
              <div key={`edit-${table.title}-${tableIndex}`} className="space-y-2">
                <input
                  value={draft.tables[tableIndex].title}
                  onChange={(e) => updateTableMeta(tableIndex, 'title', e.target.value)}
                  className="input-field text-sm font-bold"
                />
                <input
                  value={draft.tables[tableIndex].caption || ''}
                  onChange={(e) => updateTableMeta(tableIndex, 'caption', e.target.value)}
                  placeholder={t('tableCaption')}
                  className="input-field text-xs"
                />
                {detectStaffColumns(table.columns) && (
                  <>
                    <p className="text-[10px] text-[var(--text-muted)]">{t('staffAutoCalcHint')}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addStaffingRow(tableIndex)}
                        className="btn-secondary px-2 py-1 text-xs"
                      >
                        + {t('addStaffingRow')}
                      </button>
                    </div>
                  </>
                )}
                <div className="table-wrapper table-scroll-sm">
                  <table>
                    <thead>
                      <tr>
                        {table.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                        {detectStaffColumns(table.columns) && (
                          <th>{t('employeeActions')}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {draft.tables[tableIndex].rows.map((row, rowIndex) => {
                        const columnMap = detectStaffColumns(table.columns);
                        const isTotal =
                          columnMap !== null && isTotalRow(row, columnMap.position);

                        return (
                        <tr key={`${row[0]}-${rowIndex}`}>
                          {row.map((cell, cellIndex) => {
                            const autoCell = isAutoCalculatedCell(table.columns, cellIndex);
                            const staffCell = isStaffCell(table.columns, cellIndex);

                            if (staffCell && !isTotal) {
                              return (
                                <td key={`${rowIndex}-${cellIndex}`} className="p-1">
                                  <div className="flex min-w-[5.5rem] items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => adjustStaff(tableIndex, rowIndex, -1)}
                                      className="btn-secondary px-2 py-1 text-xs"
                                      aria-label={t('decreaseStaff')}
                                    >
                                      −
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={cell}
                                      onChange={(e) =>
                                        updateCell(
                                          tableIndex,
                                          rowIndex,
                                          cellIndex,
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded border border-[var(--border)] bg-[var(--bg-input)] px-1 py-1 text-center text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => adjustStaff(tableIndex, rowIndex, 1)}
                                      className="btn-secondary px-2 py-1 text-xs"
                                      aria-label={t('increaseStaff')}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={`${rowIndex}-${cellIndex}`} className="p-1">
                                <input
                                  value={cell}
                                  readOnly={autoCell || isTotal}
                                  onChange={(e) =>
                                    updateCell(tableIndex, rowIndex, cellIndex, e.target.value)
                                  }
                                  className={`w-full min-w-[4rem] rounded border px-2 py-1 text-xs ${
                                    autoCell || isTotal
                                      ? 'cursor-default border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]'
                                      : 'border-[var(--border)] bg-[var(--bg-input)]'
                                  }`}
                                />
                              </td>
                            );
                          })}
                          {columnMap && (
                            <td className="p-1">
                              {!isTotal ? (
                                <button
                                  type="button"
                                  onClick={() => removeStaffingRow(tableIndex, rowIndex)}
                                  className="btn-danger px-2 py-0.5 text-[10px]"
                                >
                                  {t('removeStaffingRow')}
                                </button>
                              ) : null}
                            </td>
                          )}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <DataTableView key={`${table.title}-${tableIndex}`} table={table} />
            )
          )}
        </div>
      )}

      {section === 'finance' && activeFinanceSection === 'finance-payroll' && (
        <FinancePayrollPanel staffContent={liveStaffContent} />
      )}

      {section === 'finance' && activeFinanceSection === 'finance-position-handover' && (
        <FinancePositionHandoverPanel
          organizationId={organizationId}
          organization={organization}
          financeContent={displayData}
          staffContent={liveStaffContent}
          onHandoverSaved={setPayrollLedgerMonth}
          onUpdate={setData}
        />
      )}

      {section === 'finance' && activeFinanceSection === 'finance-payroll-ledger' && (
        <FinancePayrollLedgerPanel
          organizationId={organizationId}
          organization={organization}
          financeContent={displayData}
          staffContent={liveStaffContent}
          preferredMonth={payrollLedgerMonth}
          onPreferredMonthApplied={() => setPayrollLedgerMonth(null)}
          onStaffRefreshed={setLiveStaffContent}
          onUpdate={setData}
        />
      )}

      {section === 'finance' && activeFinanceSection === 'finance-bank-payment' && (
        <FinanceBankPaymentPanel
          organization={organization}
          financeContent={displayData}
          staffContent={liveStaffContent}
          preferredMonth={payrollLedgerMonth}
          onPreferredMonthApplied={() => setPayrollLedgerMonth(null)}
        />
      )}

      {section === 'finance' && activeFinanceSection === 'finance-labor-leave' && (
        <FinanceLaborLeavePanel
          organizationId={organizationId}
          organization={organization}
          financeContent={displayData}
          staffContent={liveStaffContent}
          onLaborLeaveSaved={setPayrollLedgerMonth}
          onUpdate={setData}
        />
      )}

      {section === 'finance' && activeFinanceSection === 'finance-maternity-leave' && (
        <FinanceMaternityLeavePanel
          organizationId={organizationId}
          organization={organization}
          financeContent={displayData}
          staffContent={liveStaffContent}
          onMaternityLeaveSaved={setPayrollLedgerMonth}
          onUpdate={setData}
        />
      )}

      {section === 'finance' && activeFinanceSection === 'finance-sick-leave' && (
        <FinanceSickLeavePanel
          organizationId={organizationId}
          organization={organization}
          financeContent={displayData}
          staffContent={liveStaffContent}
          onSickLeaveSaved={setPayrollLedgerMonth}
          onUpdate={setData}
        />
      )}

      {section === 'finance' && activeFinanceSection === 'finance-funeral-allowance' && (
        <FinanceFuneralAllowancePanel
          organizationId={organizationId}
          organization={organization}
          financeContent={displayData}
          staffContent={liveStaffContent}
          onFuneralAllowanceSaved={setPayrollLedgerMonth}
          onUpdate={setData}
        />
      )}

      {isCharterLegalSection(section) && (
        <>
          {editing && draft ? (
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={4}
              className="input-field text-sm"
            />
          ) : null}
          <LegalDocumentsPanel
            summary={editing ? undefined : view.summary}
            items={view.items ?? []}
            sectionType={resolveLegalSectionType()}
            editing={editing && !!draft}
            onItemsChange={editing && draft ? updateDraftItems : undefined}
          />
        </>
      )}

      {section === LIST_OF_ENTERPRISES_SECTION_SLUG && (
        <>
          {editing && draft ? (
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={3}
              className="input-field text-sm"
            />
          ) : null}
          <LegalDocumentsPanel
            summary={editing ? undefined : view.summary}
            items={(editing && draft ? draft.items : view.items) ?? []}
            sectionType="general"
            editing={editing && !!draft}
            onItemsChange={editing && draft ? updateDraftItems : undefined}
            allowItemFields
            hideOfficialNote
            addItemLabel={t('listOfEnterprisesAddItem')}
            defaultItemFields={[
              { label: 'Суроға', value: '' },
              { label: 'Роҳбар', value: '' },
              { label: 'Телефон', value: '' },
              { label: 'Назорат', value: '' },
              { label: 'Ҳолат', value: '' },
            ]}
          />
        </>
      )}

      {view.items &&
        view.items.length > 0 &&
        !isCharterLegalSection(section) &&
        section !== LIST_OF_ENTERPRISES_SECTION_SLUG &&
        ((section !== 'finance' && section !== 'staff') ||
          (section === 'finance' && activeFinanceSection === 'finance-contacts') ||
          (section === 'staff' && activeStaffSection === 'staff-stats')) && (
        <div id={section === 'finance' ? 'finance-contacts' : undefined} className="space-y-3">
          {section === 'finance' && (
            <div>
              <p className="page-eyebrow">{t('financeNavContacts')}</p>
              <h4 className="text-sm font-bold">{t('financeContactsTitle')}</h4>
            </div>
          )}
          {view.items.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)]/40 p-3"
            >
              <p className="text-sm font-bold">
                <UserContentText text={item.title} as="span" />
              </p>
              {item.detail && (
                <p className="mt-1 text-sm font-medium text-[var(--accent)]">
                  <UserContentText text={item.detail} as="span" />
                </p>
              )}
              {item.description && (
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  <UserContentText text={item.description} as="span" />
                </p>
              )}
              {item.fields && item.fields.length > 0 && (
                <dl className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-2">
                  {item.fields.map((field) => (
                    <div key={field.label}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        <UserContentText text={field.label} as="span" />
                      </dt>
                      <dd className="mt-0.5 text-sm">
                        <UserContentText text={field.value} as="span" />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  {t('legalDocOpenOfficial')} ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {section === 'staff' && activeStaffSection === 'staff-registry' && (
        <StaffEmployeeRegistry
          organizationId={organizationId}
          content={displayData}
          onUpdate={(updated) => setData(applyStaffCalculations(updated))}
        />
      )}

      {section === 'staff' && activeStaffSection === 'staff-timesheet' && (
        <StaffTimesheetPanel
          organizationId={organizationId}
          content={displayData}
          onUpdate={(updated) => setData(applyStaffCalculations(updated))}
        />
      )}
    </div>
  );
}
