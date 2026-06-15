import { allowancePaymentMonth } from '@/lib/finance-allowance-calc';
import { buildPayrollLedger, upsertPayrollLedger } from '@/lib/finance-payroll-ledger';
import {
  LaborLeave,
  OrganizationSectionContent,
  PayrollLedger,
  SalaryAllowanceAdjustment,
} from '@/types/organization-section';

export {
  allowanceMonthsAffected,
  allowancePaymentMonth,
  allowanceRetroMonths,
  calcAllowanceAdjustmentAmount,
  calcAllowanceAdjustmentBreakdown,
  previewDutySalaryFromEducation,
} from '@/lib/finance-allowance-calc';
export type {
  AllowanceAdjustmentBreakdown,
  AllowanceMonthLine,
} from '@/lib/finance-allowance-calc';

export function createSalaryAllowanceAdjustment(): SalaryAllowanceAdjustment {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `allowance-${Date.now()}`,
    preparedAt: today,
    orderNumber: '',
    employeeId: '',
    department: '',
    position: '',
    kind: 'qualification_degree_difference',
    effectiveDate: today,
    paymentMonth: today.slice(0, 7),
    legalBasis: '',
    reason: '',
  };
}

export function sortSalaryAllowanceAdjustments(
  adjustments: SalaryAllowanceAdjustment[] | undefined
): SalaryAllowanceAdjustment[] {
  return [...(adjustments ?? [])].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate)
  );
}

export function upsertSalaryAllowanceAdjustment(
  adjustments: SalaryAllowanceAdjustment[] | undefined,
  adjustment: SalaryAllowanceAdjustment
): SalaryAllowanceAdjustment[] {
  const rest = (adjustments ?? []).filter((item) => item.id !== adjustment.id);
  return sortSalaryAllowanceAdjustments([...rest, adjustment]);
}

export function removeSalaryAllowanceAdjustment(
  adjustments: SalaryAllowanceAdjustment[] | undefined,
  id: string
): SalaryAllowanceAdjustment[] {
  return (adjustments ?? []).filter((item) => item.id !== id);
}

export function nextAllowanceOrderNumber(
  adjustments: SalaryAllowanceAdjustment[] | undefined
): string {
  const year = new Date().getFullYear();
  const prefix = `${year}/`;
  const numbers = (adjustments ?? [])
    .map((item) => item.orderNumber)
    .filter((value) => value.startsWith(prefix))
    .map((value) => Number.parseInt(value.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export function syncLedgersAfterAllowanceAdjustmentChange(
  payrollLedgers: PayrollLedger[] | undefined,
  salaryAllowanceAdjustments: SalaryAllowanceAdjustment[] | undefined,
  staffContent: OrganizationSectionContent,
  months: string[],
  laborLeaves?: LaborLeave[],
  organizationId?: string,
  positionHandovers?: OrganizationSectionContent['positionHandovers']
): PayrollLedger[] {
  let ledgers = payrollLedgers ?? [];

  for (const month of months) {
    const saved = ledgers.find((ledger) => ledger.month === month);
    const hasAllowanceForMonth = (salaryAllowanceAdjustments ?? []).some(
      (adjustment) => allowancePaymentMonth(adjustment) === month
    );

    if (!saved && !hasAllowanceForMonth) continue;

    const updated = buildPayrollLedger(
      month,
      staffContent,
      saved,
      positionHandovers,
      laborLeaves,
      ledgers,
      organizationId,
      salaryAllowanceAdjustments
    );
    ledgers = upsertPayrollLedger(ledgers, {
      ...updated,
      preparedAt: saved?.preparedAt ?? new Date().toISOString().slice(0, 10),
    });
  }

  return ledgers;
}
