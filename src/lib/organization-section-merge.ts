import { OrganizationSectionContent } from '@/types/organization-section';

/** Пайваст кардани мундариҷаи қадим бо нав — барои аз даст надиҳани майдонҳо ҳангоми сабт */
export function mergeOrganizationSectionContent(
  existing: OrganizationSectionContent | null | undefined,
  incoming: OrganizationSectionContent
): OrganizationSectionContent {
  if (!existing) {
    return { ...incoming };
  }

  return {
    ...existing,
    ...incoming,
    summary: incoming.summary?.trim() || existing.summary || '',
  };
}
