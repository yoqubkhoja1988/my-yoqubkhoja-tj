import {
  buildPayrollLedger,
  upsertPayrollLedger,
} from '@/lib/finance-payroll-ledger';
import {
  LaborLeave,
  OrganizationSectionContent,
  PayrollLedger,
  PositionHandover,
} from '@/types/organization-section';

export const VACANT_HANDOVER_PREFIX = 'vacant:';

export function isVacantHandoverFrom(id: string): boolean {
  return id.startsWith(VACANT_HANDOVER_PREFIX);
}

export function vacantHandoverFromId(department: string, position: string): string {
  return `${VACANT_HANDOVER_PREFIX}${encodeURIComponent(department)}|${encodeURIComponent(position)}`;
}

export function parseVacantHandoverFrom(
  id: string
): { department: string; position: string } | null {
  if (!isVacantHandoverFrom(id)) return null;
  const rest = id.slice(VACANT_HANDOVER_PREFIX.length);
  const separator = rest.indexOf('|');
  if (separator < 0) return null;
  return {
    department: decodeURIComponent(rest.slice(0, separator)),
    position: decodeURIComponent(rest.slice(separator + 1)),
  };
}

export function createPositionHandover(): PositionHandover {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `handover-${Date.now()}`,
    preparedAt: today,
    effectiveDate: today,
    fromEmployeeId: '',
    toEmployeeId: '',
    department: '',
    position: '',
    reason: '',
    duties: '',
    salaryHandoverPercent: 100,
  };
}

export function handoverMonthKey(effectiveDate: string): string {
  return effectiveDate.slice(0, 7);
}

export function syncLedgersAfterHandoverChange(
  payrollLedgers: PayrollLedger[] | undefined,
  positionHandovers: PositionHandover[] | undefined,
  staffContent: OrganizationSectionContent,
  months: string[],
  laborLeaves?: LaborLeave[]
): PayrollLedger[] {
  let ledgers = payrollLedgers ?? [];

  for (const month of months) {
    const saved = ledgers.find((ledger) => ledger.month === month);
    const hasHandoverForMonth = (positionHandovers ?? []).some(
      (handover) =>
        handoverMonthKey(handover.effectiveDate) === month &&
        (handover.salaryHandoverPercent ?? 0) > 0
    );

    if (!saved && !hasHandoverForMonth) continue;

    const updated = buildPayrollLedger(
      month,
      staffContent,
      saved,
      positionHandovers,
      laborLeaves,
      ledgers
    );
    ledgers = upsertPayrollLedger(ledgers, {
      ...updated,
      preparedAt: saved?.preparedAt ?? new Date().toISOString().slice(0, 10),
    });
  }

  return ledgers;
}

export function sortPositionHandovers(
  handovers: PositionHandover[] | undefined
): PositionHandover[] {
  return [...(handovers ?? [])].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate)
  );
}

export function upsertPositionHandover(
  handovers: PositionHandover[] | undefined,
  handover: PositionHandover
): PositionHandover[] {
  const rest = (handovers ?? []).filter((item) => item.id !== handover.id);
  return sortPositionHandovers([...rest, handover]);
}

export function removePositionHandover(
  handovers: PositionHandover[] | undefined,
  id: string
): PositionHandover[] {
  return (handovers ?? []).filter((item) => item.id !== id);
}
