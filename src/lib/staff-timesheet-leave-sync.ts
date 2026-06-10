import { leaveMonthsAffected } from '@/lib/finance-labor-leave-pay';
import { applyMaternityPeriodToLeave } from '@/lib/finance-maternity-leave-pay';
import {
  applyDefaultMarks,
  getDaysInMonth,
  isRestDay,
  mergeTimesheetForMonth,
  upsertTimesheet,
} from '@/lib/staff-timesheet';
import {
  LaborLeave,
  LaborLeaveType,
  StaffEmployee,
  StaffTimesheet,
} from '@/types/organization-section';
import type { TimesheetMarkCode } from '@/lib/staff-timesheet';

function toDateKey(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

/** Рамз барои навъи рухсат (мутобиқи Т-12 / амалиёти TJ) */
export function laborLeaveTypeToTimesheetMark(type: LaborLeaveType): TimesheetMarkCode {
  switch (type) {
    case 'annual':
      return 'о';
    case 'sick':
      return 'б';
    case 'maternity':
      return 'р';
    case 'study':
      return 'у';
    case 'creative':
      return 'э';
    case 'unpaid':
      return 'д';
    default:
      return 'д';
  }
}

function leaveForEmployeeOnDate(
  laborLeaves: LaborLeave[] | undefined,
  employeeId: string,
  dateKey: string
): LaborLeave | undefined {
  return (laborLeaves ?? []).find((leave) => {
    if (leave.employeeId !== employeeId) return false;
    const prepared =
      leave.leaveType === 'maternity' && leave.expectedBirthDate
        ? applyMaternityPeriodToLeave(leave)
        : leave;
    return dateKey >= prepared.startDate && dateKey <= prepared.endDate;
  });
}

/** Рӯзҳои рухсатро дар табели як моҳ бо рамзи дуруст иваз мекунад */
export function applyLaborLeavesToTimesheet(
  sheet: StaffTimesheet,
  laborLeaves: LaborLeave[] | undefined,
  monthKey: string
): StaffTimesheet {
  const daysInMonth = getDaysInMonth(monthKey);

  return {
    ...sheet,
    entries: sheet.entries.map((entry) => {
      const days = { ...entry.days };
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = toDateKey(monthKey, day);
        const leave = leaveForEmployeeOnDate(laborLeaves, entry.employeeId, dateKey);
        if (leave && !isRestDay(monthKey, day)) {
          days[String(day)] = laborLeaveTypeToTimesheetMark(leave.leaveType);
        }
      }
      return { ...entry, days };
    }),
  };
}

export function syncTimesheetMonthWithLaborLeaves(
  timesheets: StaffTimesheet[] | undefined,
  month: string,
  employees: StaffEmployee[],
  laborLeaves: LaborLeave[] | undefined
): StaffTimesheet {
  const merged = mergeTimesheetForMonth(timesheets, month, employees);
  const withDefaults = applyDefaultMarks(merged, month);
  return applyLaborLeavesToTimesheet(withDefaults, laborLeaves, month);
}

export function monthsAffectedByLaborLeaves(
  current: LaborLeave[] | undefined,
  previous: LaborLeave[] | undefined
): string[] {
  const months = new Set<string>();
  for (const leave of [...(previous ?? []), ...(current ?? [])]) {
    for (const month of leaveMonthsAffected(leave)) months.add(month);
  }
  return [...months].sort();
}

export function syncTimesheetsWithLaborLeaves(
  timesheets: StaffTimesheet[] | undefined,
  employees: StaffEmployee[],
  laborLeaves: LaborLeave[] | undefined,
  months: string[]
): StaffTimesheet[] {
  let next = timesheets ?? [];
  for (const month of months) {
    const sheet = syncTimesheetMonthWithLaborLeaves(next, month, employees, laborLeaves);
    next = upsertTimesheet(next, sheet);
  }
  return next;
}
