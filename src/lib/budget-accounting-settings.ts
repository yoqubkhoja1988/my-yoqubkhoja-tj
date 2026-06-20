import { isBudgetFundedOrganization } from '@/lib/organization-scope';
import {
  BudgetAccountingSettings,
  OrganizationSectionContent,
} from '@/types/organization-section';

export function supportsBudgetAccounting(organizationId?: string): boolean {
  return isBudgetFundedOrganization(organizationId);
}

export function defaultBudgetAccountingSettings(): BudgetAccountingSettings {
  return { fiscalYear: String(new Date().getFullYear()) };
}

export function resolveBudgetAccountingSettings(
  content: OrganizationSectionContent
): BudgetAccountingSettings {
  const defaults = defaultBudgetAccountingSettings();
  const saved = content.budgetAccountingSettings;
  return {
    ...defaults,
    ...saved,
    fiscalYear: saved?.fiscalYear?.trim() || defaults.fiscalYear,
    openingBalances: saved?.openingBalances ?? {},
  };
}
