import { buildPayrollLedger, upsertPayrollLedger } from '@/lib/finance-payroll-ledger';
import { funeralAllowanceMonthKey } from '@/lib/finance-funeral-allowance-pay';
import {
  FuneralAllowance,
  LaborLeave,
  OrganizationSectionContent,
  PayrollLedger,
  PositionHandover,
} from '@/types/organization-section';

export function sortFuneralAllowances(
  allowances: FuneralAllowance[] | undefined
): FuneralAllowance[] {
  return [...(allowances ?? [])].sort((a, b) =>
    b.paymentDate.localeCompare(a.paymentDate)
  );
}

export function upsertFuneralAllowance(
  allowances: FuneralAllowance[] | undefined,
  allowance: FuneralAllowance
): FuneralAllowance[] {
  const rest = (allowances ?? []).filter((item) => item.id !== allowance.id);
  return sortFuneralAllowances([...rest, allowance]);
}

export function removeFuneralAllowance(
  allowances: FuneralAllowance[] | undefined,
  id: string
): FuneralAllowance[] {
  return (allowances ?? []).filter((item) => item.id !== id);
}

export function nextFuneralAllowanceOrderNumber(
  allowances: FuneralAllowance[] | undefined
): string {
  const year = new Date().getFullYear();
  const prefix = `${year}/`;
  const numbers = (allowances ?? [])
    .map((item) => item.orderNumber)
    .filter((value) => value.startsWith(prefix))
    .map((value) => Number.parseInt(value.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}${next}`;
}

export function syncLedgersAfterFuneralAllowanceChange(
  payrollLedgers: PayrollLedger[] | undefined,
  funeralAllowances: FuneralAllowance[] | undefined,
  staffContent: OrganizationSectionContent,
  months: string[],
  positionHandovers?: PositionHandover[],
  laborLeaves?: LaborLeave[],
  organizationId?: string
): PayrollLedger[] {
  let ledgers = payrollLedgers ?? [];

  for (const month of months) {
    const saved = ledgers.find((ledger) => ledger.month === month);
    const hasEmployerFuneralPay = (funeralAllowances ?? []).some(
      (item) =>
        item.paymentSource === 'employer_budget' &&
        funeralAllowanceMonthKey(item.paymentDate) === month &&
        Boolean(item.payeeEmployeeId)
    );

    if (!saved && !hasEmployerFuneralPay) continue;

    const updated = buildPayrollLedger(
      month,
      staffContent,
      saved,
      positionHandovers,
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
