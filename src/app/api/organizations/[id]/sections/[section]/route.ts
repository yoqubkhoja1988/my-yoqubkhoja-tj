import {
  affectedTimesheetMonths,
  hasStoredPayrollLedger,
  syncPayrollLedgersAfterTimesheetChange,
} from '@/lib/finance-payroll-ledger';
import {
  getOrganizationSection,
  writeOrganizationSection,
} from '@/lib/organization-sections-store';
import {
  monthsAffectedByLaborLeaves,
  syncTimesheetsWithLaborLeaves,
} from '@/lib/staff-timesheet-leave-sync';
import { requireAdmin, requireSession } from '@/lib/api-guard';
import { canAccessOrganizationSection } from '@/lib/user-access';
import { OrganizationSectionContent } from '@/types/organization-section';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string; section: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id, section } = await context.params;
  if (!canAccessOrganizationSection(session, id, section)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const content = await getOrganizationSection(id, section);
  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(content);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id, section } = await context.params;
  try {
    const body = (await request.json()) as OrganizationSectionContent;
    if (!body.summary?.trim()) {
      return NextResponse.json({ error: 'Summary required' }, { status: 400 });
    }

    const previousStaff =
      section === 'staff' && body.timesheets !== undefined
        ? await getOrganizationSection(id, 'staff')
        : null;

    const previousFinance =
      section === 'finance' && body.laborLeaves !== undefined
        ? await getOrganizationSection(id, 'finance')
        : null;

    const saved = await writeOrganizationSection(id, section, {
      summary: body.summary.trim(),
      ...(body.tables ? { tables: body.tables } : {}),
      ...(body.items ? { items: body.items } : {}),
      ...(body.employees !== undefined ? { employees: body.employees } : {}),
      ...(body.vacancyNotice !== undefined ? { vacancyNotice: body.vacancyNotice } : {}),
      ...(body.timesheets !== undefined ? { timesheets: body.timesheets } : {}),
      ...(body.payrollLedgers !== undefined ? { payrollLedgers: body.payrollLedgers } : {}),
      ...(body.positionHandovers !== undefined
        ? { positionHandovers: body.positionHandovers }
        : {}),
      ...(body.laborLeaves !== undefined ? { laborLeaves: body.laborLeaves } : {}),
    });

    if (section === 'staff' && body.timesheets !== undefined) {
      const finance = await getOrganizationSection(id, 'finance');
      if (finance?.payrollLedgers?.length) {
        const months = affectedTimesheetMonths(previousStaff?.timesheets, body.timesheets).filter(
          (month) => hasStoredPayrollLedger(finance.payrollLedgers, month)
        );

        if (months.length > 0) {
          await writeOrganizationSection(id, 'finance', {
            ...finance,
            payrollLedgers: syncPayrollLedgersAfterTimesheetChange(
              finance.payrollLedgers,
              saved,
              months,
              {
                positionHandovers: finance.positionHandovers,
                laborLeaves: finance.laborLeaves,
                payrollLedgers: finance.payrollLedgers,
              }
            ),
          });
        }
      }
    }

    if (section === 'finance' && body.laborLeaves !== undefined) {
      const staff = await getOrganizationSection(id, 'staff');
      if (staff) {
        const months = monthsAffectedByLaborLeaves(
          body.laborLeaves,
          previousFinance?.laborLeaves
        );

        if (months.length > 0) {
          const syncedTimesheets = syncTimesheetsWithLaborLeaves(
            staff.timesheets,
            staff.employees ?? [],
            body.laborLeaves,
            months
          );
          await writeOrganizationSection(id, 'staff', {
            ...staff,
            timesheets: syncedTimesheets,
          });

          const financeCurrent = (await getOrganizationSection(id, 'finance')) ?? saved;
          const ledgerMonths = months.filter((month) =>
            hasStoredPayrollLedger(financeCurrent.payrollLedgers, month)
          );

          if (ledgerMonths.length > 0 && financeCurrent.payrollLedgers) {
            const refreshedStaff = (await getOrganizationSection(id, 'staff')) ?? staff;
            await writeOrganizationSection(id, 'finance', {
              ...financeCurrent,
              payrollLedgers: syncPayrollLedgersAfterTimesheetChange(
                financeCurrent.payrollLedgers,
                refreshedStaff,
                ledgerMonths,
                {
                  positionHandovers: financeCurrent.positionHandovers,
                  laborLeaves: body.laborLeaves,
                  payrollLedgers: financeCurrent.payrollLedgers,
                }
              ),
            });
          }
        }
      }
    }

    const latest = (await getOrganizationSection(id, section)) ?? saved;
    return NextResponse.json(latest);
  } catch (error) {
    console.error('PUT organization section failed:', error);
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
