import { analyzeStaffing } from '@/lib/staff-analytics';
import { formatAmount, parseAmount } from '@/lib/staff-table-calc';
import { OrganizationSectionContent } from '@/types/organization-section';

export type FinanceCategory = {
  name: string;
  planned: number;
  executed: number;
  percent: number;
};

export type FinanceAnalytics = {
  annualBudget: number;
  executed: number;
  remaining: number;
  executionPercent: number;
  monthlyPayroll: number | null;
  annualPayroll: number | null;
  payrollSharePercent: number | null;
  categories: FinanceCategory[];
  quarterly: { period: string; planned: number; executed: number; percent: number }[];
};

function isBudgetTableTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('буҷет') || lower.includes('бюджет') || lower.includes('budget')
  );
}

function isQuarterlyTableTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('фасл') ||
    lower.includes('квартал') ||
    lower.includes('quarter')
  );
}

function isTotalBudgetRow(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes('ҷамъ') || lower.includes('итого') || lower.includes('total');
}

function sumBudgetTable(content: OrganizationSectionContent): FinanceCategory[] {
  const table = content.tables?.find((item) => isBudgetTableTitle(item.title));
  if (!table || table.columns.length < 3) return [];

  return table.rows
    .filter((row) => row[0]?.trim() && !isTotalBudgetRow(row[0]))
    .map((row) => {
      const planned = parseAmount(row[1]) ?? 0;
      const executed = parseAmount(row[2]) ?? 0;
      const percent = planned > 0 ? Math.round((executed / planned) * 100) : 0;
      return { name: row[0], planned, executed, percent };
    });
}

function sumQuarterlyTable(content: OrganizationSectionContent) {
  const table = content.tables?.find((item) => isQuarterlyTableTitle(item.title));
  if (!table) return [];

  return table.rows.map((row) => {
    const planned = parseAmount(row[1]) ?? 0;
    const executed = parseAmount(row[2]) ?? 0;
    const percent = planned > 0 ? Math.round((executed / planned) * 100) : 0;
    return { period: row[0], planned, executed, percent };
  });
}

export function analyzeFinance(
  financeContent: OrganizationSectionContent,
  staffContent?: OrganizationSectionContent | null
): FinanceAnalytics {
  const categories = sumBudgetTable(financeContent);
  const quarterly = sumQuarterlyTable(financeContent);

  const annualBudget = categories.reduce((sum, item) => sum + item.planned, 0);
  const executed = categories.reduce((sum, item) => sum + item.executed, 0);
  const remaining = Math.max(0, annualBudget - executed);
  const executionPercent = annualBudget > 0 ? Math.round((executed / annualBudget) * 100) : 0;

  let monthlyPayroll: number | null = null;
  let annualPayroll: number | null = null;

  if (staffContent) {
    const staff = analyzeStaffing(staffContent);
    if (staff.monthlyFund) {
      monthlyPayroll = parseAmount(staff.monthlyFund);
      if (monthlyPayroll !== null) {
        annualPayroll = monthlyPayroll * 12;
      }
    }
  }

  const payrollSharePercent =
    annualPayroll !== null && annualBudget > 0
      ? Math.round((annualPayroll / annualBudget) * 100)
      : null;

  return {
    annualBudget,
    executed,
    remaining,
    executionPercent,
    monthlyPayroll,
    annualPayroll,
    payrollSharePercent,
    categories,
    quarterly,
  };
}

export function formatFinanceAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${formatAmount(value)} сомонӣ`;
}
