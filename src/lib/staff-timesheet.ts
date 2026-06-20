import { toIntlLocale } from '@/lib/intl-locale';
import { isHoliday } from '@/lib/staff-holidays';
import {
  LaborLeave,
  LaborLeaveType,
  StaffEmployee,
  StaffTimesheet,
  StaffTimesheetEntry,
} from '@/types/organization-section';

const PAID_LEAVE_TYPES: LaborLeaveType[] = ['annual', 'study', 'creative'];
const STATE_INSURANCE_LEAVE_TYPES: LaborLeaveType[] = ['maternity', 'sick'];

function isOnStateInsuranceLeave(
  laborLeaves: LaborLeave[] | undefined,
  employeeId: string,
  monthKey: string,
  day: number
): boolean {
  const dateKey = toDateKey(monthKey, day);
  return (laborLeaves ?? []).some((leave) => {
    if (leave.employeeId !== employeeId) return false;
    if (!STATE_INSURANCE_LEAVE_TYPES.includes(leave.leaveType)) return false;
    return dateKey >= leave.startDate && dateKey <= leave.endDate;
  });
}

function toDateKey(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

function isOnPaidLeave(
  laborLeaves: LaborLeave[] | undefined,
  employeeId: string,
  monthKey: string,
  day: number
): boolean {
  const dateKey = toDateKey(monthKey, day);
  return (laborLeaves ?? []).some((leave) => {
    if (leave.employeeId !== employeeId) return false;
    if (!PAID_LEAVE_TYPES.includes(leave.leaveType)) return false;
    return dateKey >= leave.startDate && dateKey <= leave.endDate;
  });
}

export const TIMESHEET_MARKS = [
  { code: '8', labelKey: 'timesheetMarkPresent' },
  { code: 'б', labelKey: 'timesheetMarkSick' },
  { code: 'т', labelKey: 'timesheetMarkSickUnpaid' },
  { code: 'о', labelKey: 'timesheetMarkVacation' },
  { code: 'р', labelKey: 'timesheetMarkMaternity' },
  { code: 'у', labelKey: 'timesheetMarkStudy' },
  { code: 'э', labelKey: 'timesheetMarkCreative' },
  { code: 'д', labelKey: 'timesheetMarkUnpaid' },
  { code: 'к', labelKey: 'timesheetMarkTrip' },
  { code: 'г', labelKey: 'timesheetMarkStateDuty' },
  { code: 'н', labelKey: 'timesheetMarkAbsent' },
  { code: 'с', labelKey: 'timesheetMarkOvertime' },
  { code: 'в', labelKey: 'timesheetMarkWeekend' },
] as const;

/** Рамзҳои рухсат — рӯзҳои бе музди вазифавӣ (асос) */
export const LEAVE_TIMESHEET_MARKS: TimesheetMarkCode[] = [
  'о',
  'б',
  'т',
  'р',
  'у',
  'э',
  'д',
];

export function isLeaveTimesheetMark(mark: string): boolean {
  return LEAVE_TIMESHEET_MARKS.includes(mark as TimesheetMarkCode);
}

export type TimesheetMarkCode = (typeof TIMESHEET_MARKS)[number]['code'] | '';

export function currentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return currentMonthKey(date);
}

const MAX_MONTH_ITERATIONS = 600;

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

/** Моҳҳо аз toMonth то fromMonth (YYYY-MM), ҳамроҳ */
export function monthsBetweenInclusive(fromMonth: string, toMonth: string): string[] {
  if (!isValidMonthKey(fromMonth) || !isValidMonthKey(toMonth) || fromMonth > toMonth) {
    return [];
  }

  const months: string[] = [];
  let current = toMonth;
  let guard = 0;

  while (current >= fromMonth && guard < MAX_MONTH_ITERATIONS) {
    months.push(current);
    if (current === fromMonth) break;
    current = shiftMonth(current, -1);
    guard += 1;
  }

  return months;
}

/** Моҳҳо аз anchor ба ақиб — ҳадди аксар count, нақартар аз notBeforeMonth */
export function monthsBackFrom(
  anchor: string,
  count: number,
  notBeforeMonth?: string
): string[] {
  if (!isValidMonthKey(anchor) || count <= 0) return [];

  const months: string[] = [];
  let current = anchor;

  for (let index = 0; index < count; index++) {
    if (notBeforeMonth && isValidMonthKey(notBeforeMonth) && current < notBeforeMonth) {
      break;
    }
    months.push(current);
    if (notBeforeMonth && current === notBeforeMonth) break;
    current = shiftMonth(current, -1);
  }

  return months;
}

export function formatMonthLabel(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Калидҳои i18n барои рӯзи ҳафта (0 = якшанбе … 6 = шанбе) */
export const TIMESHEET_WEEKDAY_MESSAGE_KEYS = [
  'timesheetWeekdaySun',
  'timesheetWeekdayMon',
  'timesheetWeekdayTue',
  'timesheetWeekdayWed',
  'timesheetWeekdayThu',
  'timesheetWeekdayFri',
  'timesheetWeekdaySat',
] as const;

export function getTimesheetWeekdayIndex(monthKey: string, day: number): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function formatTimesheetWeekday(
  monthKey: string,
  day: number,
  getLabel: (weekdayIndex: number) => string
): string {
  return getLabel(getTimesheetWeekdayIndex(monthKey, day));
}

export function getDaysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function isWeekend(monthKey: string, day: number): boolean {
  const [year, month] = monthKey.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
}

/** Ид дар рӯзи истироҳати ҳафтаина (шанбе/якшанбе) */
export function isWeekendHoliday(monthKey: string, day: number): boolean {
  return isHoliday(monthKey, day) && isWeekend(monthKey, day);
}

/** Рӯзи кории оддӣ (на истироҳати ҳафтаина, на ид) */
function isPlainWorkingWeekday(monthKey: string, day: number): boolean {
  return !isWeekend(monthKey, day) && !isHoliday(monthKey, day);
}

const transferredRestCache = new Map<string, ReadonlySet<number>>();

/**
 * Рӯзҳои кор, ки ба истироҳат интиқол дода мешаванд:
 * агар ид ба рӯзи истироҳат биафтад, аввалин рӯзи кории баъдӣ «в» мешавад.
 */
function computeTransferredRestDays(monthKey: string): ReadonlySet<number> {
  const daysInMonth = getDaysInMonth(monthKey);
  const transferred = new Set<number>();

  let day = 1;
  while (day <= daysInMonth) {
    if (!isWeekendHoliday(monthKey, day)) {
      day += 1;
      continue;
    }

    let blockEnd = day;
    while (blockEnd < daysInMonth) {
      const next = blockEnd + 1;
      if (!isWeekend(monthKey, next) && !isWeekendHoliday(monthKey, next)) break;
      blockEnd = next;
    }

    let candidate = blockEnd + 1;
    while (candidate <= daysInMonth) {
      if (isPlainWorkingWeekday(monthKey, candidate) && !transferred.has(candidate)) {
        transferred.add(candidate);
        break;
      }
      candidate += 1;
    }

    day = blockEnd + 1;
  }

  return transferred;
}

export function getTransferredRestDays(monthKey: string): ReadonlySet<number> {
  const cached = transferredRestCache.get(monthKey);
  if (cached) return cached;

  const computed = computeTransferredRestDays(monthKey);
  transferredRestCache.set(monthKey, computed);
  return computed;
}

export function getTransferredRestDaysList(monthKey: string): number[] {
  return [...getTransferredRestDays(monthKey)].sort((a, b) => a - b);
}

export function isTransferredRestDay(monthKey: string, day: number): boolean {
  return getTransferredRestDays(monthKey).has(day);
}

/** Рӯзи истироҳат: ҳафтаина, ид ё истироҳати интиқолӣ */
export function isRestDay(monthKey: string, day: number): boolean {
  return (
    isWeekend(monthKey, day) ||
    isHoliday(monthKey, day) ||
    isTransferredRestDay(monthKey, day)
  );
}

export function activeEmployees(employees: StaffEmployee[] = []): StaffEmployee[] {
  return employees.filter((employee) => employee.status !== 'inactive');
}

export function mergeTimesheetForMonth(
  timesheets: StaffTimesheet[] | undefined,
  month: string,
  employees: StaffEmployee[]
): StaffTimesheet {
  const employeeIds = activeEmployees(employees).map((employee) => employee.id);
  const existing = timesheets?.find((sheet) => sheet.month === month);

  if (existing) {
    const entries = [...existing.entries];
    for (const employeeId of employeeIds) {
      if (!entries.some((entry) => entry.employeeId === employeeId)) {
        entries.push({ employeeId, days: {} });
      }
    }
    return {
      month,
      entries: entries.filter((entry) => employeeIds.includes(entry.employeeId)),
    };
  }

  return {
    month,
    entries: employeeIds.map((employeeId) => ({ employeeId, days: {} })),
  };
}

export function getTimesheetForMonth(
  timesheets: StaffTimesheet[] | undefined,
  month: string,
  employees: StaffEmployee[]
): StaffTimesheet {
  return applyDefaultMarks(mergeTimesheetForMonth(timesheets, month, employees), month);
}

export function upsertTimesheet(
  timesheets: StaffTimesheet[] | undefined,
  sheet: StaffTimesheet
): StaffTimesheet[] {
  const rest = (timesheets ?? []).filter((item) => item.month !== sheet.month);
  return [...rest, sheet].sort((a, b) => b.month.localeCompare(a.month));
}

export function removeTimesheet(
  timesheets: StaffTimesheet[] | undefined,
  month: string
): StaffTimesheet[] {
  return (timesheets ?? []).filter((item) => item.month !== month);
}

export function hasStoredTimesheet(
  timesheets: StaffTimesheet[] | undefined,
  month: string
): boolean {
  return (timesheets ?? []).some((item) => item.month === month);
}

/** Аломати рӯз — холӣ → пешфарз (8 барои рӯзи корӣ, в барои истироҳат/ид) */
export function resolveTimesheetMark(
  entry: StaffTimesheetEntry,
  monthKey: string,
  day: number
): TimesheetMarkCode {
  const explicit = entry.days[String(day)];
  if (explicit !== undefined && explicit !== '') {
    return explicit as TimesheetMarkCode;
  }
  return getDefaultMark(monthKey, day);
}

/** Рӯзҳои коршуда: танҳо аломати «8» (соатҳои корӣ) */
export function countWorkedDays(entry: StaffTimesheetEntry, monthKey?: string): number {
  if (!monthKey) {
    return Object.values(entry.days).filter((mark) => mark === '8').length;
  }

  const daysInMonth = getDaysInMonth(monthKey);
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (resolveTimesheetMark(entry, monthKey, day) === '8') {
      count += 1;
    }
  }
  return count;
}

/** Рӯзҳои корӣ дар муддати санаҳо (бе рӯзҳои истироҳат, ид ва истироҳати интиқолӣ) */
export function countWorkingDaysInRange(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    const day = cursor.getDate();
    if (!isRestDay(monthKey, day)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Рӯзҳои кории меъёр (рӯзҳои тақвимии корӣ бе ид/истироҳати ҳафтаина) */
export function countNormWorkingDays(monthKey: string): number {
  const daysInMonth = getDaysInMonth(monthKey);
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (!isRestDay(monthKey, day)) count += 1;
  }
  return count;
}

export type PayrollWorkedDaysOptions = {
  laborLeaves?: LaborLeave[];
  employeeId?: string;
};

/**
 * Рӯзҳо барои ҳисоби музди вазифавӣ (сутуни музди асосӣ).
 * «8» — кор; «в» дар рӯзи корӣ — бо музд, аммо на дар давраи рухсатӣ; «о» — ба сутуни рухсатӣ.
 */
export function countPayrollWorkedDays(
  entry: StaffTimesheetEntry,
  monthKey: string,
  options?: PayrollWorkedDaysOptions
): number {
  const daysInMonth = getDaysInMonth(monthKey);
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (
      options?.employeeId &&
      isOnStateInsuranceLeave(options.laborLeaves, options.employeeId, monthKey, day)
    ) {
      continue;
    }
    const mark = resolveTimesheetMark(entry, monthKey, day);
    if (isLeaveTimesheetMark(mark)) continue;
    if (mark === '8') {
      count += 1;
      continue;
    }
    if (mark === 'в' && !isRestDay(monthKey, day)) {
      if (
        options?.employeeId &&
        isOnPaidLeave(options.laborLeaves, options.employeeId, monthKey, day)
      ) {
        continue;
      }
      count += 1;
    }
  }
  return count;
}

/** Рӯзҳои бе музд дар рӯзи корӣ: танҳо «н» (ғайриҳузур) */
export function countUnpaidWorkingDays(entry: StaffTimesheetEntry, monthKey: string): number {
  const daysInMonth = getDaysInMonth(monthKey);
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (isRestDay(monthKey, day)) continue;
    if (resolveTimesheetMark(entry, monthKey, day) === 'н') count += 1;
  }
  return count;
}

export function countWorkedHours(entry: StaffTimesheetEntry, monthKey?: string): number {
  return countWorkedDays(entry, monthKey) * 8;
}

export function getDefaultMark(monthKey: string, day: number): TimesheetMarkCode {
  return isRestDay(monthKey, day) ? 'в' : '8';
}

/** Пур кардани рӯзҳои холӣ: кор → 8, истироҳат/ид → в */
export function applyDefaultMarks(
  sheet: StaffTimesheet,
  monthKey: string
): StaffTimesheet {
  const daysInMonth = getDaysInMonth(monthKey);

  return {
    ...sheet,
    entries: sheet.entries.map((entry) => {
      const days = { ...entry.days };
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = String(day);
        if (isTransferredRestDay(monthKey, day)) {
          days[key] = 'в';
        } else if (!days[key]) {
          days[key] = getDefaultMark(monthKey, day);
        }
      }
      return { ...entry, days };
    }),
  };
}

/** @deprecated Use applyDefaultMarks */
export function fillRestDayMarks(sheet: StaffTimesheet, monthKey: string): StaffTimesheet {
  return applyDefaultMarks(sheet, monthKey);
}

/** @deprecated Use applyDefaultMarks */
export function fillWeekendMarks(sheet: StaffTimesheet, monthKey: string): StaffTimesheet {
  return applyDefaultMarks(sheet, monthKey);
}
