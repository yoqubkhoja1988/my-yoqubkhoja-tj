import { isStateInsuranceLeaveType, leaveOverlapsMonth } from '@/lib/finance-labor-leave-pay';
import {
  applyMaternityPeriodToLeave,
  calcMaternityBenefitBreakdown,
  MATERNITY_BENEFIT_MONTHS,
} from '@/lib/finance-maternity-leave-pay';
import { calcSickBenefitForMonth } from '@/lib/finance-sick-leave-pay';
import {
  LaborLeave,
  LaborLeaveType,
  OrganizationSectionContent,
  PayrollLedger,
} from '@/types/organization-section';

export type SocialInsurancePaymentKind = 'maternity' | 'sick';

export type SocialInsuranceBankPayment = {
  employeeId: string;
  leaveId: string;
  kind: SocialInsurancePaymentKind;
  amount: number;
  leaveType: LaborLeaveType;
};

/** Рӯзҳои тақвимии рухсат дар моҳ (бе хориҷ кардани ид) */
export function inclusiveLeaveDaysInMonth(
  startDate: string,
  endDate: string,
  month: string
): number {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  if (endDate < monthStart || startDate > monthEnd) return 0;

  const rangeStart = startDate > monthStart ? startDate : monthStart;
  const rangeEnd = endDate < monthEnd ? endDate : monthEnd;
  const start = new Date(`${rangeStart}T12:00:00`);
  const end = new Date(`${rangeEnd}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

/** Маблағи пособиеи суғурта барои як моҳ (пропорсионал ба рӯзҳои рухсат дар моҳ) */
export function socialInsurancePayForLeaveInMonth(
  leave: LaborLeave,
  month: string,
  staffContent: OrganizationSectionContent,
  payrollLedgers?: PayrollLedger[]
): number {
  if (!isStateInsuranceLeaveType(leave.leaveType) || !leave.employeeId) return 0;
  if (!leaveOverlapsMonth(leave, month)) return 0;

  if (leave.leaveType === 'maternity') {
    const prepared = applyMaternityPeriodToLeave(leave);
    const breakdown = calcMaternityBenefitBreakdown(prepared, staffContent, payrollLedgers);
    if (!breakdown || breakdown.amount <= 0) return 0;

    const totalDays = breakdown.leaveDays;
    const daysInMonth = inclusiveLeaveDaysInMonth(prepared.startDate, prepared.endDate, month);
    if (daysInMonth <= 0 || totalDays <= 0) return 0;

    return (breakdown.amount * daysInMonth) / totalDays;
  }

  return calcSickBenefitForMonth(leave, month, staffContent);
}

export function collectSocialInsuranceBankPayments(
  laborLeaves: LaborLeave[] | undefined,
  staffContent: OrganizationSectionContent,
  payrollLedgers: PayrollLedger[] | undefined,
  month: string
): SocialInsuranceBankPayment[] {
  const payments: SocialInsuranceBankPayment[] = [];

  for (const leave of laborLeaves ?? []) {
    if (!isStateInsuranceLeaveType(leave.leaveType)) continue;
    const amount = socialInsurancePayForLeaveInMonth(leave, month, staffContent, payrollLedgers);
    if (amount <= 0) continue;

    payments.push({
      employeeId: leave.employeeId,
      leaveId: leave.id,
      kind: leave.leaveType === 'maternity' ? 'maternity' : 'sick',
      amount: Math.round(amount * 100) / 100,
      leaveType: leave.leaveType,
    });
  }

  return payments.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
}

export function socialInsurancePurposeTj(
  kind: SocialInsurancePaymentKind,
  monthLabel: string,
  year: string
): string {
  if (kind === 'maternity') {
    return `Пособиеи рухсатии ҳомиладорӣ (суғуртаи иҷтимоӣ) барои моҳи ${monthLabel} соли ${year}`;
  }
  return `Пособиеи беморӣ (суғуртаи иҷтимоӣ) барои моҳи ${monthLabel} соли ${year}`;
}

export { MATERNITY_BENEFIT_MONTHS };
