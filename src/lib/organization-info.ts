import {
  FOOD_SAFETY_CENTER_ID,
  KINDERGARTEN_SCHOOL_ID,
} from '@/lib/activity-directions';
import {
  OrganizationReportHeader,
  OrganizationSectionContent,
} from '@/types/organization-section';

export const ORG_INFO_SECTION_SLUG = 'org-info';

export const ORG_INFO_DEFAULT_SUMMARY =
  'Маълумот барои сарлавҳаи расмии ҳисоботҳои ташкилот.';

const DEFAULT_SUPERIOR_BY_ORG: Record<string, string[]> = {
  [FOOD_SAFETY_CENTER_ID]: [
    'Кумитаи бехатарии озуқавории назди Ҳукумати Ҷумҳурии Тоҷикистон',
  ],
  [KINDERGARTEN_SCHOOL_ID]: [
    'Вазорати таълим ва илми Ҷумҳурии Тоҷикистон',
    'Назорати давлатии таълими вилояти Суғд',
  ],
};

export function defaultOrgInfoContent(organizationId: string): OrganizationSectionContent {
  return {
    summary: ORG_INFO_DEFAULT_SUMMARY,
    reportHeader: {
      superiorAuthorities: [...(DEFAULT_SUPERIOR_BY_ORG[organizationId] ?? [''])],
    },
  };
}

export function resolveOrganizationReportName(
  reportHeader: OrganizationReportHeader | undefined,
  fallbackName: string
): string {
  const custom = reportHeader?.reportOrganizationName?.trim();
  return custom || fallbackName;
}

export function resolveSuperiorAuthorities(
  reportHeader: OrganizationReportHeader | undefined,
  fallbackLines: string[]
): string[] {
  const lines = (reportHeader?.superiorAuthorities ?? [])
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : fallbackLines.filter(Boolean);
}
