import {
  affectedTimesheetMonths,
  hasStoredPayrollLedger,
} from '@/lib/finance-payroll-ledger';
import {
  applyPayrollLedgerTimesheetSync,
  rebuildPayrollMemorialJournalInFinance,
} from '@/lib/payroll-accounting';
import {
  getOrganizationSection,
  writeOrganizationSection,
} from '@/lib/organization-sections-store';
import {
  monthsAffectedByLaborLeaves,
  syncTimesheetsWithLaborLeaves,
} from '@/lib/staff-timesheet-leave-sync';
import { mergeOrganizationSectionContent } from '@/lib/organization-section-merge';
import { requireSession } from '@/lib/api-guard';
import { validateOrganizationSectionIsolation, isBudgetFundedOrganization } from '@/lib/organization-scope';
import {
  DEFAULT_FINANCIAL_REPORTS_CONTENT,
  isFinancialReportSection,
  resolveFinancialReportStorageSlug,
} from '@/lib/financial-reports-menu';
import { syncOfficialLegalForOrganization } from '@/lib/official-legal-sync';
import { LEGAL_SECTION_SLUGS } from '@/lib/official-legal-catalog';
import { canAccessOrganizationSection, canEditOrganizationSection } from '@/lib/user-access';
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

  const isLegalSection =
    section === LEGAL_SECTION_SLUGS.laws ||
    section === LEGAL_SECTION_SLUGS.decisions ||
    section === LEGAL_SECTION_SLUGS.documents;

  const storageSlug = resolveFinancialReportStorageSlug(section);

  let content = await getOrganizationSection(id, storageSlug);
  if (isLegalSection && (!content || !content.items?.length)) {
    await syncOfficialLegalForOrganization(id);
    content = await getOrganizationSection(id, storageSlug);
  }
  if (isFinancialReportSection(section) && !content) {
    content = { ...DEFAULT_FINANCIAL_REPORTS_CONTENT };
  }
  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(content);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id, section } = await context.params;
  const storageSlug = resolveFinancialReportStorageSlug(section);
  if (!canEditOrganizationSection(session, id, section)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as OrganizationSectionContent;
    if (!body.summary?.trim()) {
      return NextResponse.json({ error: 'Summary required' }, { status: 400 });
    }

    validateOrganizationSectionIsolation(id, storageSlug, body);

    const previousStaff =
      section === 'staff' && body.timesheets !== undefined
        ? await getOrganizationSection(id, 'staff')
        : null;

    const previousFinance =
      section === 'finance' ? await getOrganizationSection(id, 'finance') : null;

    const previousFinanceForLeaves =
      section === 'finance' && body.laborLeaves !== undefined ? previousFinance : null;

    let contentToSave: OrganizationSectionContent;

    if (storageSlug === 'finance') {
      contentToSave = mergeOrganizationSectionContent(previousFinance, body);
      if (
        isBudgetFundedOrganization(id) &&
        contentToSave.payrollLedgers?.some((ledger) => ledger.preparedAt)
      ) {
        contentToSave = rebuildPayrollMemorialJournalInFinance(contentToSave);
      }
    } else {
      contentToSave = {
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
        ...(body.salaryAllowanceAdjustments !== undefined
          ? { salaryAllowanceAdjustments: body.salaryAllowanceAdjustments }
          : {}),
        ...(body.laborLeaves !== undefined ? { laborLeaves: body.laborLeaves } : {}),
        ...(body.localPayrollRequirementSettings !== undefined
          ? { localPayrollRequirementSettings: body.localPayrollRequirementSettings }
          : {}),
        ...(body.parentMembershipFeeSettings !== undefined
          ? { parentMembershipFeeSettings: body.parentMembershipFeeSettings }
          : {}),
        ...(body.preschoolEnrollees !== undefined
          ? { preschoolEnrollees: body.preschoolEnrollees }
          : {}),
        ...(body.parentMembershipFeePayments !== undefined
          ? { parentMembershipFeePayments: body.parentMembershipFeePayments }
          : {}),
        ...(body.parentFoodPaymentSettings !== undefined
          ? { parentFoodPaymentSettings: body.parentFoodPaymentSettings }
          : {}),
        ...(body.parentFoodPayments !== undefined
          ? { parentFoodPayments: body.parentFoodPayments }
          : {}),
        ...(body.budgetAccountingSettings !== undefined
          ? { budgetAccountingSettings: body.budgetAccountingSettings }
          : {}),
        ...(body.budgetAccountingJournal !== undefined
          ? { budgetAccountingJournal: body.budgetAccountingJournal }
          : {}),
        ...(body.reportHeader !== undefined ? { reportHeader: body.reportHeader } : {}),
        ...(body.contractCounterparties !== undefined
          ? { contractCounterparties: body.contractCounterparties }
          : {}),
        ...(body.serviceContracts !== undefined ? { serviceContracts: body.serviceContracts } : {}),
        ...(body.serviceInvoices !== undefined ? { serviceInvoices: body.serviceInvoices } : {}),
      };
    }

    const saved = await writeOrganizationSection(id, storageSlug, contentToSave);

    if (section === 'staff' && body.timesheets !== undefined) {
      const finance = await getOrganizationSection(id, 'finance');
      if (finance?.payrollLedgers?.length) {
        const months = affectedTimesheetMonths(previousStaff?.timesheets, body.timesheets).filter(
          (month) => hasStoredPayrollLedger(finance.payrollLedgers, month)
        );

        if (months.length > 0) {
          await writeOrganizationSection(
            id,
            'finance',
            applyPayrollLedgerTimesheetSync(finance, saved, months, {
              organizationId: id,
              positionHandovers: finance.positionHandovers,
              salaryAllowanceAdjustments: finance.salaryAllowanceAdjustments,
              laborLeaves: finance.laborLeaves,
              payrollLedgers: finance.payrollLedgers,
            })
          );
        }
      }
    }

    if (section === 'finance' && body.laborLeaves !== undefined) {
      const staff = await getOrganizationSection(id, 'staff');
      if (staff) {
        const months = monthsAffectedByLaborLeaves(
          body.laborLeaves,
          previousFinanceForLeaves?.laborLeaves
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
            await writeOrganizationSection(
              id,
              'finance',
              applyPayrollLedgerTimesheetSync(financeCurrent, refreshedStaff, ledgerMonths, {
                organizationId: id,
                positionHandovers: financeCurrent.positionHandovers,
                salaryAllowanceAdjustments: financeCurrent.salaryAllowanceAdjustments,
                laborLeaves: body.laborLeaves,
                payrollLedgers: financeCurrent.payrollLedgers,
              })
            );
          }
        }
      }
    }

    const latest = (await getOrganizationSection(id, storageSlug)) ?? saved;
    return NextResponse.json(latest);
  } catch (error) {
    console.error('PUT organization section failed:', error);
    const message = error instanceof Error ? error.message : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
