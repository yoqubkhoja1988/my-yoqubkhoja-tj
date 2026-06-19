/**
 * Мемориалӣ-фармонҳо барои ташкилотҳои буҷетӣ (ГМБ).
 *
 * Асос: Дастурамал №204 (09.04.2015), Фармоиши Вазорати молия №173,
 * Қонуни ҶТ «Дар бораи бухгалтерии ҳисобот ва ҳисоботи молиявӣ».
 */

import {
  NYAH_ACCUMULATED_DEPRECIATION_ACCOUNT,
  NYAH_BUDGET_DEFERRED_REVENUE_LOCAL,
  NYAH_CONSUMABLES_EXPENSE_ACCOUNT,
  NYAH_CONSUMABLES_INVENTORY_ACCOUNT,
  NYAH_COST_OF_GOODS_SOLD_ACCOUNT,
  NYAH_DEPRECIATION_EXPENSE_ACCOUNT,
  NYAH_FINISHED_PRODUCTS_ACCOUNT,
  NYAH_FOOD_EXPENSE_ACCOUNT,
  NYAH_FOOD_INVENTORY_ACCOUNT,
  NYAH_GRANT_REVENUE_ACCOUNT,
  NYAH_INCOME_TAX_PAYABLE_ACCOUNT,
  NYAH_EMPLOYER_SOCIAL_TAX_PAYABLE_ACCOUNT,
  NYAH_PAYROLL_EXPENSE_ACCOUNT,
  NYAH_PAYROLL_PAYABLE_ACCOUNT,
  NYAH_SOCIAL_TAX_PAYABLE_ACCOUNT,
  NYAH_SUPPLIER_PAYABLE_ACCOUNT,
} from '@/lib/budget-unified-chart-of-accounts';
import type { BudgetOperationTemplate } from '@/lib/budget-accounting-journal';

export const BUDGET_MEMORIAL_ORDER_LEGAL_BASIS = [
  'Қонуни ҶТ «Дар бораи бухгалтерии ҳисобот ва ҳисоботи молиявӣ»',
  'Дастурамал оид ба тартиби тартиб додани ҳисоботҳои молиявӣ №204 (09.04.2015)',
  'Фармоиши Вазорати молия №173 (26.01.2015) — НЯҲ',
] as const;

export const BUDGET_MEMORIAL_ORDER_RULES = [
  'Мемориалӣ-фармон ҳуҷҷати асосии баҳисобгирӣ барои амалиётҳое аст, ки бо фармони пардохт ё касса анҷом намешаванд.',
  'Музди меҳнат, амортизатсия, истеъмоли мавод, эътирофи даромад ва бастани андоз бо мемориалӣ-фармон сабт мешаванд.',
  'Ҳар қайд бояд бо мувофиқаи дутарафа (дебет = кредит) мувофиқи НЯҲ бошад.',
] as const;

/** Мемориалӣ-фармонҳои стандартӣ барои гирандаи маблағҳои буҷетӣ */
export const BUDGET_MEMORIAL_ORDER_TEMPLATES: BudgetOperationTemplate[] = [
  {
    id: 'mo-payroll-accrual',
    labelKey: 'nyahMoPayrollAccrual',
    descriptionKey: 'nyahMoPayrollAccrualDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Фармоиш №173, ҳ. 9646–9647',
    buildLines: (amount) => [
      { accountCode: NYAH_PAYROLL_EXPENSE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_PAYROLL_PAYABLE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-payroll-social-tax',
    labelKey: 'nyahMoPayrollSocialTax',
    descriptionKey: 'nyahMoPayrollSocialTaxDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Фармоиш №173, ҳ. 9654–9656',
    buildLines: (amount) => [
      { accountCode: NYAH_PAYROLL_PAYABLE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_SOCIAL_TAX_PAYABLE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-payroll-income-tax',
    labelKey: 'nyahMoPayrollIncomeTax',
    descriptionKey: 'nyahMoPayrollIncomeTaxDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Фармоиш №173, ҳ. 9654–9656',
    buildLines: (amount) => [
      { accountCode: NYAH_PAYROLL_PAYABLE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_INCOME_TAX_PAYABLE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-social-insurance-leave',
    labelKey: 'nyahMoSocialInsuranceLeave',
    descriptionKey: 'nyahMoSocialInsuranceLeaveDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Фармоиш №173 — пособиеи суғуртаи иҷтимоӣ',
    buildLines: (amount) => [
      { accountCode: NYAH_EMPLOYER_SOCIAL_TAX_PAYABLE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_PAYROLL_PAYABLE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-depreciation',
    labelKey: 'nyahMoDepreciation',
    descriptionKey: 'nyahMoDepreciationDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Фармоиш №173, ҳ. 10146–10147',
    buildLines: (amount) => [
      { accountCode: NYAH_DEPRECIATION_EXPENSE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_ACCUMULATED_DEPRECIATION_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-food-consumption',
    labelKey: 'nyahMoFoodConsumption',
    descriptionKey: 'nyahMoFoodConsumptionDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Дастурамал №204, шакли №3, сатр 060',
    buildLines: (amount) => [
      { accountCode: NYAH_FOOD_EXPENSE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_FOOD_INVENTORY_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-material-consumption',
    labelKey: 'nyahMoMaterialConsumption',
    descriptionKey: 'nyahMoMaterialConsumptionDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Дастурамал №204, шакли №3, сатр 080',
    buildLines: (amount) => [
      { accountCode: NYAH_CONSUMABLES_EXPENSE_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_CONSUMABLES_INVENTORY_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-supplier-accrual',
    labelKey: 'nyahMoSupplierAccrual',
    descriptionKey: 'nyahMoSupplierAccrualDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Фармоиш №173, ҳ. 8228–8231',
    buildLines: (amount) => [
      { accountCode: NYAH_CONSUMABLES_INVENTORY_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_SUPPLIER_PAYABLE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-food-accrual',
    labelKey: 'nyahMoFoodAccrual',
    descriptionKey: 'nyahMoFoodAccrualDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Фармоиш №173, ҳ. 8228–8231',
    buildLines: (amount) => [
      { accountCode: NYAH_FOOD_INVENTORY_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_SUPPLIER_PAYABLE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-budget-revenue-recognition',
    labelKey: 'nyahMoBudgetRevenueRecognition',
    descriptionKey: 'nyahMoBudgetRevenueRecognitionDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Дастурамал №204, ҳ. 236–240',
    buildLines: (amount) => [
      { accountCode: NYAH_BUDGET_DEFERRED_REVENUE_LOCAL, debit: amount, credit: 0 },
      { accountCode: NYAH_GRANT_REVENUE_ACCOUNT, debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-tax-accrual',
    labelKey: 'nyahMoTaxAccrual',
    descriptionKey: 'nyahMoTaxAccrualDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Дастурамал №204, ҳ. 272–274',
    buildLines: (amount) => [
      { accountCode: '5 22 540', debit: amount, credit: 0 },
      { accountCode: '2 11 690', debit: 0, credit: amount },
    ],
  },
  {
    id: 'mo-product-cost',
    labelKey: 'nyahMoProductCost',
    descriptionKey: 'nyahMoProductCostDesc',
    documentTypeKey: 'nyahDocMemorialOrder',
    category: 'memorial',
    instructionRef: 'Дастурамал №204, ҳ. 276–279',
    buildLines: (amount) => [
      { accountCode: NYAH_COST_OF_GOODS_SOLD_ACCOUNT, debit: amount, credit: 0 },
      { accountCode: NYAH_FINISHED_PRODUCTS_ACCOUNT, debit: 0, credit: amount },
    ],
  },
];

export function memorialOrderTemplates(): BudgetOperationTemplate[] {
  return BUDGET_MEMORIAL_ORDER_TEMPLATES;
}
