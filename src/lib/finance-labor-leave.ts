import { buildPayrollLedger, upsertPayrollLedger } from '@/lib/finance-payroll-ledger';
import {
  calcLeaveCalendarDays,
  isPaidLaborLeaveType,
  leaveMonthsAffected,
  leaveOverlapsMonth,
} from '@/lib/finance-labor-leave-pay';
import {
  FuneralAllowance,
  LaborLeave,
  LaborLeaveType,
  OrganizationSectionContent,
  PayrollLedger,
} from '@/types/organization-section';

export const LABOR_LEAVE_TYPES: LaborLeaveType[] = [
  'annual',
  'unpaid',
  'sick',
  'maternity',
  'study',
  'creative',
  'other',
];

export const GENERAL_LABOR_LEAVE_TYPES: LaborLeaveType[] = LABOR_LEAVE_TYPES.filter(
  (type) => type !== 'maternity' && type !== 'sick'
);

export function isMaternityLaborLeave(leave: LaborLeave): boolean {
  return leave.leaveType === 'maternity';
}

export function isSickLaborLeave(leave: LaborLeave): boolean {
  return leave.leaveType === 'sick';
}

export function filterMaternityLeaves(leaves: LaborLeave[] | undefined): LaborLeave[] {
  return sortLaborLeaves((leaves ?? []).filter(isMaternityLaborLeave));
}

export function filterSickLeaves(leaves: LaborLeave[] | undefined): LaborLeave[] {
  return sortLaborLeaves((leaves ?? []).filter(isSickLaborLeave));
}

export function filterGeneralLaborLeaves(leaves: LaborLeave[] | undefined): LaborLeave[] {
  return sortLaborLeaves(
    (leaves ?? []).filter((leave) => !isMaternityLaborLeave(leave) && !isSickLaborLeave(leave))
  );
}

/** @deprecated Истифодаи filterGeneralLaborLeaves */
export function filterNonMaternityLeaves(leaves: LaborLeave[] | undefined): LaborLeave[] {
  return filterGeneralLaborLeaves(leaves);
}

/** Рӯзҳои тақвимии рухсат бе рӯзҳои ид (КМҶ моддаи 101.2) */
export function calcLeaveDays(startDate: string, endDate: string): number {
  return calcLeaveCalendarDays(startDate, endDate).calendarDays;
}

export function createLaborLeave(): LaborLeave {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `leave-${Date.now()}`,
    preparedAt: today,
    orderNumber: '',
    employeeId: '',
    department: '',
    position: '',
    leaveType: 'annual',
    startDate: today,
    endDate: today,
    days: 1,
    reason: '',
    substituteEmployeeId: '',
    salaryPeriodMonths: 12,
    calculationBasis: 'twelve_months',
  };
}

export function sortLaborLeaves(leaves: LaborLeave[] | undefined): LaborLeave[] {
  return [...(leaves ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function upsertLaborLeave(
  leaves: LaborLeave[] | undefined,
  leave: LaborLeave
): LaborLeave[] {
  const rest = (leaves ?? []).filter((item) => item.id !== leave.id);
  return sortLaborLeaves([...rest, leave]);
}

export function removeLaborLeave(
  leaves: LaborLeave[] | undefined,
  id: string
): LaborLeave[] {
  return (leaves ?? []).filter((item) => item.id !== id);
}

export function syncLedgersAfterLaborLeaveChange(
  payrollLedgers: PayrollLedger[] | undefined,
  laborLeaves: LaborLeave[] | undefined,
  staffContent: OrganizationSectionContent,
  months: string[],
  organizationId?: string,
  funeralAllowances?: FuneralAllowance[]
): PayrollLedger[] {
  let ledgers = payrollLedgers ?? [];

  for (const month of months) {
    const saved = ledgers.find((ledger) => ledger.month === month);
    const hasEmployerPaidLeave = (laborLeaves ?? []).some(
      (leave) => isPaidLaborLeaveType(leave.leaveType) && leaveOverlapsMonth(leave, month)
    );
    const affectsWorkedDays = (laborLeaves ?? []).some(
      (leave) =>
        (isPaidLaborLeaveType(leave.leaveType) ||
          leave.leaveType === 'maternity' ||
          leave.leaveType === 'sick') &&
        leaveOverlapsMonth(leave, month)
    );

    // Корношоямӣ/ҳомиладорӣ — аз суғурта; китоби нав танҳо барои рухсатии пардохтшавандаи корфармо
    if (!saved) {
      if (!hasEmployerPaidLeave) continue;
    } else if (!affectsWorkedDays) {
      continue;
    }

    const updated = buildPayrollLedger(
      month,
      staffContent,
      saved,
      undefined,
      laborLeaves,
      ledgers,
      organizationId,
      funeralAllowances
    );
    ledgers = upsertPayrollLedger(ledgers, {
      ...updated,
      preparedAt: saved?.preparedAt ?? new Date().toISOString().slice(0, 10),
    });
  }

  return ledgers;
}

export function nextLaborLeaveOrderNumber(leaves: LaborLeave[] | undefined): string {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const numbers = (leaves ?? [])
    .map((item) => item.orderNumber.trim())
    .filter((value) => value.startsWith(prefix))
    .map((value) => Number.parseInt(value.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}
