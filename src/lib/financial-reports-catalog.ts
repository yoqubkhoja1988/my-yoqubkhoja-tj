/** Дастурамал №204, 09.04.2015 — Вазорати молияи ҶТ (СҲМБДТ) */

export type FinancialReportPeriod = 'annual' | 'quarterly';

export type FinancialReportForm = {
  id: string;
  formCode: string;
  titleKey: string;
  parentId?: string;
  periods: FinancialReportPeriod[];
};

export const FINANCIAL_REPORT_INSTRUCTION = {
  number: '№204',
  date: '09.04.2015',
  titleKey: 'financeReportsInstructionTitle',
  issuerKey: 'financeReportsInstructionIssuer',
  standardKey: 'financeReportsInstructionStandard',
} as const;

export const FINANCIAL_REPORT_FORMS: FinancialReportForm[] = [
  {
    id: 'form-1',
    formCode: '№1',
    titleKey: 'financeReportForm1',
    periods: ['annual', 'quarterly'],
  },
  {
    id: 'form-1-1',
    formCode: '№1/1',
    titleKey: 'financeReportForm1_1',
    parentId: 'form-1',
    periods: ['annual', 'quarterly'],
  },
  {
    id: 'form-1-2',
    formCode: '№1/2',
    titleKey: 'financeReportForm1_2',
    parentId: 'form-1',
    periods: ['annual'],
  },
  {
    id: 'form-1-3',
    formCode: '№1/3',
    titleKey: 'financeReportForm1_3',
    parentId: 'form-1',
    periods: ['annual'],
  },
  {
    id: 'form-1-4',
    formCode: '№1/4',
    titleKey: 'financeReportForm1_4',
    parentId: 'form-1',
    periods: ['annual'],
  },
  {
    id: 'form-1-5',
    formCode: '№1/5',
    titleKey: 'financeReportForm1_5',
    parentId: 'form-1',
    periods: ['annual'],
  },
  {
    id: 'form-1-6',
    formCode: '№1/6',
    titleKey: 'financeReportForm1_6',
    parentId: 'form-1',
    periods: ['annual'],
  },
  {
    id: 'form-1-7',
    formCode: '№1/7',
    titleKey: 'financeReportForm1_7',
    parentId: 'form-1',
    periods: ['annual', 'quarterly'],
  },
  {
    id: 'form-1-8',
    formCode: '№1/8',
    titleKey: 'financeReportForm1_8',
    parentId: 'form-1',
    periods: ['annual', 'quarterly'],
  },
  {
    id: 'form-2',
    formCode: '№2',
    titleKey: 'financeReportForm2',
    periods: ['annual', 'quarterly'],
  },
  {
    id: 'form-2-1',
    formCode: '№2/1',
    titleKey: 'financeReportForm2_1',
    parentId: 'form-2',
    periods: ['annual', 'quarterly'],
  },
  {
    id: 'form-3',
    formCode: '№3',
    titleKey: 'financeReportForm3',
    periods: ['annual'],
  },
  {
    id: 'form-3-1',
    formCode: '№3/1',
    titleKey: 'financeReportForm3_1',
    parentId: 'form-3',
    periods: ['annual'],
  },
  {
    id: 'form-4',
    formCode: '№4',
    titleKey: 'financeReportForm4',
    periods: ['annual'],
  },
  {
    id: 'form-4-1',
    formCode: '№4/1',
    titleKey: 'financeReportForm4_1',
    parentId: 'form-4',
    periods: ['annual'],
  },
  {
    id: 'form-5',
    formCode: '№5',
    titleKey: 'financeReportForm5',
    periods: ['annual', 'quarterly'],
  },
  {
    id: 'form-6',
    formCode: '№6',
    titleKey: 'financeReportForm6',
    periods: ['annual', 'quarterly'],
  },
];

export function rootFinancialReportForms(period: FinancialReportPeriod): FinancialReportForm[] {
  return FINANCIAL_REPORT_FORMS.filter(
    (form) => !form.parentId && form.periods.includes(period)
  );
}

export function childFinancialReportForms(
  parentId: string,
  period: FinancialReportPeriod
): FinancialReportForm[] {
  return FINANCIAL_REPORT_FORMS.filter(
    (form) => form.parentId === parentId && form.periods.includes(period)
  );
}
