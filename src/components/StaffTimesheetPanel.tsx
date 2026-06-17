'use client';

import OrganizationReportDocumentHeader from '@/components/OrganizationReportDocumentHeader';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import { getHolidayLabelKey, getHolidaysInMonth, isHoliday } from '@/lib/staff-holidays';
import { formatAppDate } from '@/lib/intl-locale';
import { getDirectorSignatureLabel } from '@/lib/organization-scope';
import { updateOrganizationSection } from '@/lib/organization-sections';
import { getAccountantSignatureLabel } from '@/lib/staff-signature-labels';
import { downloadTimesheetExcel } from '@/lib/staff-timesheet-export';
import {
  TIMESHEET_MARKS,
  activeEmployees,
  countNormWorkingDays,
  countWorkedDays,
  countWorkedHours,
  currentMonthKey,
  applyDefaultMarks,
  formatMonthLabel,
  formatTimesheetWeekday,
  getDaysInMonth,
  getTransferredRestDaysList,
  hasStoredTimesheet,
  mergeTimesheetForMonth,
  isRestDay,
  isTransferredRestDay,
  isWeekend,
  removeTimesheet,
  resolveTimesheetMark,
  shiftMonth,
  TIMESHEET_WEEKDAY_MESSAGE_KEYS,
  upsertTimesheet,
} from '@/lib/staff-timesheet';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { printDocument } from '@/lib/print-document';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent, StaffTimesheet } from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  organizationId: string;
  organization?: Organization;
  content: OrganizationSectionContent;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function TimesheetMarkCell({
  mark,
  editing,
  saving,
  employeeName,
  day,
  onChange,
}: {
  mark: string;
  editing: boolean;
  saving: boolean;
  employeeName: string;
  day: number;
  onChange: (mark: string) => void;
}) {
  const displayMark = mark || '—';

  return (
    <>
      {editing ? (
        <select
          value={mark}
          onChange={(e) => onChange(e.target.value)}
          disabled={saving}
          className="w-9 rounded border border-slate-300 bg-white px-0.5 py-1 text-center text-[10px] text-slate-900 shadow-sm"
          aria-label={`${employeeName} ${day}`}
        >
          <option value="" />
          {TIMESHEET_MARKS.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code}
            </option>
          ))}
        </select>
      ) : (
        <span className="inline-block min-w-[1.25rem] text-center text-[10px] font-medium text-slate-900">
          {displayMark}
        </span>
      )}
    </>
  );
}

export default function StaffTimesheetPanel({
  organizationId,
  organization,
  content,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { canEdit } = useOrganizationAccess();
  const employees = activeEmployees(content.employees);

  const [month, setMonth] = useState(currentMonthKey());
  const [sheet, setSheet] = useState<StaffTimesheet>(() =>
    applyDefaultMarks(
      mergeTimesheetForMonth(content.timesheets, month, content.employees ?? []),
      month
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(
    () => !hasStoredTimesheet(content.timesheets, month)
  );
  const previousMonthRef = useRef(month);

  const daysInMonth = useMemo(() => getDaysInMonth(month), [month]);
  const dayNumbers = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth]
  );
  const monthHolidays = useMemo(() => getHolidaysInMonth(month), [month]);
  const transferredRestDays = useMemo(() => getTransferredRestDaysList(month), [month]);
  const normWorkingDays = useMemo(() => countNormWorkingDays(month), [month]);
  const monthLabel = useMemo(() => formatMonthLabel(month, locale), [month, locale]);
  const preparedAt = formatAppDate(new Date(), locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const directorSignatureLabel = getDirectorSignatureLabel(organizationId);
  const accountantSignatureLabel = useMemo(
    () =>
      getAccountantSignatureLabel(content, {
        chiefAccountantName: organization?.chiefAccountant,
      }),
    [content, organization?.chiefAccountant]
  );
  const legendLines = useMemo(
    () => TIMESHEET_MARKS.map((mark) => `${mark.code} — ${t(mark.labelKey)}`),
    [t, locale]
  );
  const weekdayLabels = useMemo(
    () => TIMESHEET_WEEKDAY_MESSAGE_KEYS.map((key) => t(key)),
    [t, locale]
  );
  const formatWeekdayLabel = useMemo(
    () => (day: number) => formatTimesheetWeekday(month, day, (index) => weekdayLabels[index] ?? ''),
    [month, weekdayLabels]
  );

  useEffect(() => {
    const merged = mergeTimesheetForMonth(content.timesheets, month, content.employees ?? []);
    const filled = applyDefaultMarks(merged, month);
    const stored = hasStoredTimesheet(content.timesheets, month);
    setSheet(filled);
    setDirty(!stored && JSON.stringify(merged) !== JSON.stringify(filled));
  }, [content.timesheets, content.employees, month]);

  useEffect(() => {
    if (previousMonthRef.current === month) return;
    previousMonthRef.current = month;
    setEditing(!hasStoredTimesheet(content.timesheets, month));
  }, [month, content.timesheets]);

  function updateDay(employeeId: string, day: number, mark: string) {
    const dayKey = String(day);
    const syncToAllEmployees = mark === 'в';

    setSheet((current) => ({
      ...current,
      entries: current.entries.map((entry) => {
        if (!syncToAllEmployees && entry.employeeId !== employeeId) return entry;
        return {
          ...entry,
          days: { ...entry.days, [dayKey]: mark },
        };
      }),
    }));
    setDirty(true);
  }

  async function persistTimesheet(nextSheet: StaffTimesheet) {
    setSaving(true);
    setError('');

    const payload: OrganizationSectionContent = {
      ...content,
      timesheets: upsertTimesheet(content.timesheets, nextSheet),
    };

    const saved = await updateOrganizationSection(organizationId, 'staff', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return false;
    }

    onUpdate(saved);
    setDirty(false);
    setEditing(false);
    return true;
  }

  async function handleSave() {
    await persistTimesheet(sheet);
  }

  function handleEdit() {
    setEditing(true);
    setError('');
  }

  async function handleDelete() {
    if (!confirm(t('confirmDeleteTimesheet'))) return;

    setSaving(true);
    setError('');

    const payload: OrganizationSectionContent = {
      ...content,
      timesheets: removeTimesheet(content.timesheets, month),
    };

    const saved = await updateOrganizationSection(organizationId, 'staff', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return;
    }

    onUpdate(saved);
    const merged = mergeTimesheetForMonth(saved.timesheets, month, saved.employees ?? []);
    const filled = applyDefaultMarks(merged, month);
    setSheet(filled);
    setEditing(true);
    setDirty(JSON.stringify(merged) !== JSON.stringify(filled));
  }

  function handleFillDefaults() {
    const nextSheet = applyDefaultMarks(sheet, month);
    setSheet(nextSheet);
    setDirty(true);
  }

  function handlePrint() {
    printDocument('staff-timesheet-document');
  }

  async function handleExcelExport() {
    await downloadTimesheetExcel({
      sheet,
      employees,
      month,
      monthLabel,
      normWorkingDays,
      labels: {
        title: t('timesheetDocumentTitle'),
        month: t('timesheetForMonth'),
        normDays: t('timesheetNormDays', { days: normWorkingDays }),
        no: t('staffColNo'),
        employee: t('timesheetEmployee'),
        personnelNumber: t('employeePersonnelNumber'),
        totalDays: t('timesheetTotalDays'),
        totalHours: t('timesheetTotalHours'),
        legend: t('timesheetLegend'),
        weekdayLabels,
      },
      legendLines,
    });
  }

  function getEntry(employeeId: string) {
    return sheet.entries.find((entry) => entry.employeeId === employeeId);
  }

  return (
    <section id="staff-timesheet" className="mt-8 border-t border-[var(--border)] pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="page-eyebrow">{t('staffNavTimesheet')}</p>
          <h4 className="text-base font-bold">{t('timesheetTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('timesheetSubtitle')}</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">{t('timesheetAutoFillHint')}</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            {t('timesheetNormDays', { days: normWorkingDays })}
          </p>
          {!editing && hasStoredTimesheet(content.timesheets, month) && (
            <p className="mt-1 text-[10px] text-emerald-400">{t('timesheetSavedHint')}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            className="btn-secondary px-2 py-1 text-xs"
            disabled={saving}
          >
            ←
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input-field w-auto text-xs"
          />
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            className="btn-secondary px-2 py-1 text-xs"
            disabled={saving}
          >
            →
          </button>
          {canEdit && editing && (
            <button
              type="button"
              onClick={handleFillDefaults}
              className="btn-secondary text-xs"
              disabled={saving || employees.length === 0}
            >
              {t('timesheetFillDefaults')}
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary text-xs"
            disabled={employees.length === 0}
          >
            {t('timesheetPrint')}
          </button>
          <DocumentExportMenu
            documentId="staff-timesheet-document"
            filename={`tabel-${month}`}
            disabled={employees.length === 0}
            customExcelExport={handleExcelExport}
          />
          {canEdit &&
            (editing ? (
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary text-xs"
                disabled={saving}
              >
                {saving ? t('saving') : t('save')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleEdit}
                  className="btn-secondary text-xs"
                  disabled={saving}
                >
                  {t('timesheetEdit')}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-danger text-xs"
                  disabled={saving}
                >
                  {t('timesheetDelete')}
                </button>
              </>
            ))}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300 print:hidden">
          {error}
        </p>
      )}

      <div className="staff-timesheet-scroll w-full overflow-x-auto print:overflow-visible">
        <div
          id="staff-timesheet-document"
          lang="tg"
          className="staff-timesheet-document mx-auto min-w-[72rem] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm print:min-w-0 print:border-0 print:p-2 print:shadow-none md:p-6"
        >
          <OrganizationReportDocumentHeader
            variant="document"
            showAddress={organization?.address}
          />

          <div className="mb-4 text-center text-xs leading-relaxed text-slate-700">
            <h3 className="text-lg font-bold tracking-wide text-slate-900">
              {t('timesheetDocumentTitle')}
            </h3>
            <p className="mt-1 text-sm">{t('timesheetForMonth', { month: monthLabel })}</p>
            <p className="mt-1 text-xs">{t('timesheetNormDays', { days: normWorkingDays })}</p>
          </div>

          <div className="mb-4 hidden flex-wrap gap-x-3 gap-y-1 text-[9px] leading-snug text-slate-700 print:flex">
            <span className="font-bold uppercase">{t('timesheetLegend')}:</span>
            {TIMESHEET_MARKS.map((mark) => (
              <span key={mark.code}>
                <strong>{mark.code}</strong> — {t(mark.labelKey)}
              </span>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2 print:hidden">
            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
              {t('timesheetLegend')}:
            </span>
            {TIMESHEET_MARKS.map((mark) => (
              <span
                key={mark.code}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-input)] px-2 py-0.5 text-[10px]"
              >
                <strong>{mark.code}</strong> — {t(mark.labelKey)}
              </span>
            ))}
          </div>

          {monthHolidays.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] text-slate-700">
              <span className="font-bold uppercase text-amber-700">{t('timesheetHolidays')}:</span>
              {monthHolidays.map((holiday) => (
                <span
                  key={`${holiday.day}-${holiday.labelKey}`}
                  className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 print:rounded-none print:border-0 print:bg-transparent print:px-0"
                >
                  {holiday.day} — {t(holiday.labelKey)}
                  {isWeekend(month, holiday.day) ? ` (${t('timesheetHolidayOnWeekend')})` : ''}
                </span>
              ))}
            </div>
          )}

          {transferredRestDays.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 text-[10px] text-slate-700">
              <span className="font-bold uppercase text-violet-700">
                {t('timesheetTransferredRest')}:
              </span>
              {transferredRestDays.map((day) => (
                <span
                  key={`transfer-${day}`}
                  className="rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 print:rounded-none print:border-0 print:bg-transparent print:px-0"
                >
                  {t('timesheetTransferredRestDay', { day })}
                </span>
              ))}
            </div>
          )}

          {employees.length === 0 ? (
            <div className="empty-state py-8 print:hidden">
              <div className="empty-state-icon">📅</div>
              <p className="text-sm text-[var(--text-muted)]">{t('timesheetNoEmployees')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[68rem] border-collapse text-[9px] md:text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="sticky left-0 z-10 border border-slate-300 bg-slate-50 px-1 py-1 print:static">
                      {t('staffColNo')}
                    </th>
                    <th className="sticky left-8 z-10 min-w-[10rem] border border-slate-300 bg-slate-50 px-1 py-1 text-left print:static">
                      {t('timesheetEmployee')}
                    </th>
                    <th className="sticky left-[12rem] z-10 border border-slate-300 bg-slate-50 px-1 py-1 print:static">
                      {t('employeePersonnelNumber')}
                    </th>
                    {dayNumbers.map((day) => {
                      const holidayKey = getHolidayLabelKey(month, day);
                      const transferred = isTransferredRestDay(month, day);

                      return (
                        <th
                          key={day}
                          title={
                            holidayKey
                              ? t(holidayKey)
                              : transferred
                                ? t('timesheetTransferredRestTitle')
                                : undefined
                          }
                          className={`min-w-[1.75rem] border border-slate-300 px-0.5 py-1 text-center ${
                            holidayKey
                              ? 'bg-amber-100 text-amber-900'
                              : transferred
                                ? 'bg-violet-100 text-violet-900'
                                : isWeekend(month, day)
                                  ? 'bg-slate-100 text-slate-600'
                                  : ''
                          }`}
                        >
                          <span className="block font-semibold leading-none">{day}</span>
                          <span className="mt-0.5 block text-[8px] font-normal leading-none text-slate-600">
                            {formatWeekdayLabel(day)}
                          </span>
                        </th>
                      );
                    })}
                    <th className="border border-slate-300 px-1 py-1">{t('timesheetTotalDays')}</th>
                    <th className="border border-slate-300 px-1 py-1">{t('timesheetTotalHours')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, index) => {
                    const entry = getEntry(employee.id);
                    const workedDays = entry ? countWorkedDays(entry, month) : 0;
                    const workedHours = entry ? countWorkedHours(entry, month) : 0;

                    return (
                      <tr key={employee.id}>
                        <td className="sticky left-0 z-[1] border border-slate-300 bg-white px-1 py-0.5 text-center print:static">
                          {index + 1}
                        </td>
                        <td className="sticky left-8 z-[1] min-w-[10rem] border border-slate-300 bg-white px-1 py-0.5 font-semibold print:static">
                          {employee.fullName}
                        </td>
                        <td className="sticky left-[12rem] z-[1] border border-slate-300 bg-white px-1 py-0.5 font-mono text-center print:static">
                          {employee.personnelNumber || '—'}
                        </td>
                        {dayNumbers.map((day) => {
                          const mark = entry
                            ? resolveTimesheetMark(entry, month, day)
                            : '';
                          const holiday = isHoliday(month, day);
                          const transferred = isTransferredRestDay(month, day);
                          const restDay = isRestDay(month, day);

                          return (
                            <td
                              key={day}
                              title={
                                getHolidayLabelKey(month, day)
                                  ? t(getHolidayLabelKey(month, day)!)
                                  : transferred
                                    ? t('timesheetTransferredRestTitle')
                                    : undefined
                              }
                              className={`border border-slate-300 p-0.5 text-center ${
                                holiday
                                  ? 'bg-amber-50'
                                  : transferred
                                    ? 'bg-violet-50'
                                    : restDay
                                      ? 'bg-slate-50'
                                      : ''
                              }`}
                            >
                              <TimesheetMarkCell
                                mark={mark}
                                editing={editing}
                                saving={saving}
                                employeeName={employee.fullName}
                                day={day}
                                onChange={(value) => updateDay(employee.id, day, value)}
                              />
                            </td>
                          );
                        })}
                        <td className="border border-slate-300 px-1 py-0.5 text-center font-semibold">
                          {workedDays}
                        </td>
                        <td className="border border-slate-300 px-1 py-0.5 text-center font-semibold">
                          {workedHours}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {employees.length > 0 && (
            <>
              <div className="mt-4 space-y-1 text-xs text-slate-700">
                <p>
                  {t('timesheetEmployeeCountLine', { count: employees.length })}
                </p>
                <p>
                  {t('timesheetPreparedAt')}: <strong>{preparedAt}</strong>
                </p>
              </div>

              <div className="mt-8 grid gap-8 text-xs text-slate-700 md:grid-cols-3">
                <div>
                  <p className="font-semibold">{directorSignatureLabel}</p>
                  <p className="mt-6 border-t border-slate-400 pt-1">
                    {organization?.director || '________________'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{accountantSignatureLabel}</p>
                  <p className="mt-6 border-t border-slate-400 pt-1">
                    {organization?.chiefAccountant || '________________'}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="font-semibold">{t('payrollLedgerSeal')}</p>
                  <div className="mt-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-300" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
