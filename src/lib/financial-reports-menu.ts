import { ActivityDirection } from '@/types/activity-direction';
import { OrganizationSectionContent } from '@/types/organization-section';

/** Маълумот дар DB — як бахши умумӣ барои ҳамаи зерменю */
export const FINANCIAL_REPORTS_STORAGE_SLUG = 'financial-reports';

export type FinancialReportView =
  | 'overview'
  | 'form1'
  | 'form2'
  | 'form3'
  | 'form4'
  | 'form5'
  | 'form6'
  | 'annual'
  | 'quarterly'
  | 'deadlines';

export const FINANCIAL_REPORT_SECTION_SLUGS = [
  'financial-reports',
  'financial-reports-form1',
  'financial-reports-form2',
  'financial-reports-form3',
  'financial-reports-form4',
  'financial-reports-form5',
  'financial-reports-form6',
  'financial-reports-annual',
  'financial-reports-quarterly',
  'financial-reports-deadlines',
] as const;

const VIEW_BY_SLUG: Record<string, FinancialReportView> = {
  'financial-reports': 'overview',
  'financial-reports-form1': 'form1',
  'financial-reports-form2': 'form2',
  'financial-reports-form3': 'form3',
  'financial-reports-form4': 'form4',
  'financial-reports-form5': 'form5',
  'financial-reports-form6': 'form6',
  'financial-reports-annual': 'annual',
  'financial-reports-quarterly': 'quarterly',
  'financial-reports-deadlines': 'deadlines',
};

export function isFinancialReportSection(slug: string): boolean {
  return (FINANCIAL_REPORT_SECTION_SLUGS as readonly string[]).includes(slug);
}

export function resolveFinancialReportStorageSlug(slug: string): string {
  return isFinancialReportSection(slug) ? FINANCIAL_REPORTS_STORAGE_SLUG : slug;
}

export function resolveFinancialReportView(slug: string): FinancialReportView {
  return VIEW_BY_SLUG[slug] ?? 'overview';
}

export const FINANCIAL_REPORT_FORM_ID_BY_VIEW: Partial<
  Record<FinancialReportView, string>
> = {
  form1: 'form-1',
  form2: 'form-2',
  form3: 'form-3',
  form4: 'form-4',
  form5: 'form-5',
  form6: 'form-6',
};

export const DEFAULT_FINANCIAL_REPORTS_CONTENT: OrganizationSectionContent = {
  summary:
    'Ҳисоботҳои молиявии муассиса мувофиқи Дастурамал №204 (09.04.2015) ва стандартҳои СҲМБДТ тартиб дода мешаванд.',
  items: [],
  tables: [],
};

/** Зерменюи «Ҳисоботҳои молиявӣ» — барои ҳамаи ташкилотҳо */
export function getFinancialReportMenuDirections(): ActivityDirection[] {
  return [
    {
      slug: 'financial-reports',
      icon: '📊',
      labelKey: 'actFinancialReportsOverview',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-form1',
      icon: '📑',
      labelKey: 'actFinancialReportsForm1',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-form2',
      icon: '📈',
      labelKey: 'actFinancialReportsForm2',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-form3',
      icon: '📉',
      labelKey: 'actFinancialReportsForm3',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-form4',
      icon: '💵',
      labelKey: 'actFinancialReportsForm4',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-form5',
      icon: '📋',
      labelKey: 'actFinancialReportsForm5',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-form6',
      icon: '👥',
      labelKey: 'actFinancialReportsForm6',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-annual',
      icon: '📅',
      labelKey: 'actFinancialReportsAnnual',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-quarterly',
      icon: '🗓️',
      labelKey: 'actFinancialReportsQuarterly',
      groupKey: 'actGroupFinancialReports',
    },
    {
      slug: 'financial-reports-deadlines',
      icon: '⏱️',
      labelKey: 'actFinancialReportsDeadlines',
      groupKey: 'actGroupFinancialReports',
    },
  ];
}
