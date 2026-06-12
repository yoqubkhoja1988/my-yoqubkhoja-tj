'use client';

import { getHolidayLabelKey, getHolidaysInMonth, isHoliday } from '@/lib/staff-holidays';
import {
  TIMESHEET_MARKS,
  activeEmployees,
  countNormWorkingDays,
  countWorkedDays,
  countWorkedHours,
  currentMonthKey,
  applyDefaultMarks,
  formatMonthLabel,
  getDaysInMonth,
  getTransferredRestDaysList,
  hasStoredTimesheet,
  mergeTimesheetForMonth,
  isRestDay,
  isTransferredRestDay,
  isWeekend,
  removeTimesheet,
  shiftMonth,
  upsertTimesheet,
} from '@/lib/staff-timesheet';
import { updateOrganizationSection } from '@/lib/organization-sections';
import DocumentExportMenu from '@/components/DocumentExportMenu';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { printDocument } from '@/lib/print-document';
import { OrganizationSectionContent, StaffTimesheet } from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  organizationId: string;
  content: OrganizationSectionContent;
  onUpdate: (content: OrganizationSectionContent) => void;
};

export default function StaffTimesheetPanel({ organizationId, content, onUpdate }: Props) {
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

  const daysInMonth = useMemo(() => getDaysInMonth(month), [month]);
  const dayNumbers = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth]
  );
  const monthHolidays = useMemo(() => getHolidaysInMonth(month), [month]);
  const transferredRestDays = useMemo(() => getTransferredRestDaysList(month), [month]);
  const normWorkingDays = useMemo(() => countNormWorkingDays(month), [month]);

  useEffect(() => {
    const merged = mergeTimesheetForMonth(content.timesheets, month, content.employees ?? []);
    const filled = applyDefaultMarks(merged, month);
    const stored = hasStoredTimesheet(content.timesheets, month);
    setSheet(filled);
    setEditing(!stored);
    setDirty(!stored && JSON.stringify(merged) !== JSON.stringify(filled));
  }, [content.timesheets, content.employees, month]);

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

      <div
        id="staff-timesheet-document"
        className="staff-timesheet-document rounded-xl border border-[var(--border)] bg-[var(--bg-input)]/20 p-4"
      >
        <div className="mb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
            {t('timesheetTitle')}
          </p>
          <p className="mt-1 text-sm font-semibold">{formatMonthLabel(month, locale)}</p>
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
          <div className="mb-4 flex flex-wrap gap-2 print:hidden">
            <span className="text-[10px] font-bold uppercase text-amber-400">
              {t('timesheetHolidays')}:
            </span>
            {monthHolidays.map((holiday) => (
              <span
                key={`${holiday.day}-${holiday.labelKey}`}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200"
              >
                {holiday.day} — {t(holiday.labelKey)}
                {isWeekend(month, holiday.day) ? ` (${t('timesheetHolidayOnWeekend')})` : ''}
              </span>
            ))}
          </div>
        )}

        {transferredRestDays.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 print:hidden">
            <span className="text-[10px] font-bold uppercase text-violet-400">
              {t('timesheetTransferredRest')}:
            </span>
            {transferredRestDays.map((day) => (
              <span
                key={`transfer-${day}`}
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200"
              >
                {t('timesheetTransferredRestDay', { day })}
              </span>
            ))}
          </div>
        )}

        {employees.length === 0 ? (
          <div className="empty-state py-8">
            <div className="empty-state-icon">📅</div>
            <p className="text-sm text-[var(--text-muted)]">{t('timesheetNoEmployees')}</p>
          </div>
        ) : (
          <div className="table-wrapper table-scroll-sm">
            <table>
              <caption className="print:hidden">
                {t('timesheetTitle')} — {formatMonthLabel(month, locale)}
              </caption>
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-[var(--bg-card)]">{t('staffColNo')}</th>
                  <th className="sticky left-8 z-10 min-w-[10rem] bg-[var(--bg-card)]">
                    {t('timesheetEmployee')}
                  </th>
                  <th className="sticky left-[12rem] z-10 bg-[var(--bg-card)]">
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
                        className={`min-w-[2.25rem] text-center text-[10px] ${
                          holidayKey
                            ? 'bg-amber-500/15 text-amber-300'
                            : transferred
                              ? 'bg-violet-500/15 text-violet-300'
                              : isWeekend(month, day)
                                ? 'bg-white/5 text-[var(--text-muted)]'
                                : ''
                        }`}
                      >
                        {day}
                        {holidayKey && <span className="block text-[8px]">★</span>}
                        {!holidayKey && transferred && (
                          <span className="block text-[8px]">↺</span>
                        )}
                      </th>
                    );
                  })}
                  <th>{t('timesheetTotalDays')}</th>
                  <th>{t('timesheetTotalHours')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => {
                  const entry = getEntry(employee.id);
                  const workedDays = entry ? countWorkedDays(entry, month) : 0;
                  const workedHours = entry ? countWorkedHours(entry, month) : 0;

                  return (
                    <tr key={employee.id}>
                      <td className="sticky left-0 z-[1] bg-[var(--bg-card)]">{index + 1}</td>
                      <td className="sticky left-8 z-[1] min-w-[10rem] bg-[var(--bg-card)] font-semibold">
                        {employee.fullName}
                      </td>
                      <td className="sticky left-[12rem] z-[1] bg-[var(--bg-card)] font-mono text-xs">
                        {employee.personnelNumber || '—'}
                      </td>
                      {dayNumbers.map((day) => {
                        const mark = entry?.days[String(day)] ?? '';
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
                            className={`p-0.5 text-center ${
                              holiday
                                ? 'bg-amber-500/10'
                                : transferred
                                  ? 'bg-violet-500/10'
                                  : restDay
                                    ? 'bg-white/5'
                                    : ''
                            }`}
                          >
                            <select
                              value={mark}
                              onChange={(e) => updateDay(employee.id, day, e.target.value)}
                              disabled={!editing || saving}
                              className={`w-9 rounded border border-[var(--border)] bg-[var(--bg-input)] px-0.5 py-1 text-center text-[10px] print:pointer-events-none print:appearance-none print:border-none print:bg-transparent ${
                                !editing ? 'cursor-default opacity-80' : ''
                              }`}
                              aria-label={`${employee.fullName} ${day}`}
                            >
                              <option value="" />
                              {TIMESHEET_MARKS.map((item) => (
                                <option key={item.code} value={item.code}>
                                  {item.code}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                      <td className="font-semibold text-emerald-400">{workedDays}</td>
                      <td className="font-semibold text-blue-400">{workedHours}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
