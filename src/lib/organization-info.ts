import {
  FOOD_SAFETY_CENTER_ID,
  KINDERGARTEN_SCHOOL_ID,
} from '@/lib/activity-directions';
import {
  OrganizationReportHeader,
  OrganizationReportLocale,
  OrganizationReportNames,
  OrganizationSectionContent,
} from '@/types/organization-section';

export const ORG_INFO_SECTION_SLUG = 'org-info';

export const ORG_REPORT_LOCALES: OrganizationReportLocale[] = ['tj', 'ru', 'en', 'uz'];

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

const DEFAULT_ORG_NAMES_BY_ORG: Record<string, OrganizationReportNames> = {
  [FOOD_SAFETY_CENTER_ID]: {
    tj: 'МАРКАЗИ ТАЪМИНОТИ БЕХАТАРИИ ОЗУҚОВОРИИ НОҲИЯИ ҶАББОР РАСУЛОВ',
    ru: 'Центр обеспечения пищевой безопасности района имени Джаббор Расулова',
    en: 'Jabbor Rasulov District Food Safety Center',
    uz: 'Jabbor Rasulov tumani oziq-ovqat xavfsizligini ta’minlash markazi',
  },
  [KINDERGARTEN_SCHOOL_ID]: {
    tj: 'МУАССИСАИ ДАВЛАТИИ ТАЪЛИМИИ ТОМАКТАБИИ МАКТАБ- КӮДАКИСТОНИ №1 НОҲИЯИ ҶАББОР РАСУЛОВ',
    ru: 'Государственное дошкольное образовательное учреждение «Школа-детский сад № 1» района имени Джаббор Расулова',
    en: 'State Preschool Educational Institution «School-Kindergarten No. 1» of Jabbor Rasulov District',
    uz: 'Jabbor Rasulov tumani 1-son maktab-bog‘cha davlat maktabgacha ta’lim muassasasi',
  },
};

export function defaultOrgInfoContent(organizationId: string): OrganizationSectionContent {
  return {
    summary: ORG_INFO_DEFAULT_SUMMARY,
    reportHeader: {
      reportOrganizationNames: { ...(DEFAULT_ORG_NAMES_BY_ORG[organizationId] ?? {}) },
      superiorAuthorities: [...(DEFAULT_SUPERIOR_BY_ORG[organizationId] ?? [''])],
    },
  };
}

export function normalizeReportOrganizationNames(
  reportHeader?: OrganizationReportHeader
): OrganizationReportNames {
  const names: OrganizationReportNames = { ...(reportHeader?.reportOrganizationNames ?? {}) };
  const legacy = reportHeader?.reportOrganizationName?.trim();
  if (legacy && !names.tj?.trim()) {
    names.tj = legacy;
  }
  return names;
}

export function resolveOrganizationReportName(
  reportHeader: OrganizationReportHeader | undefined,
  fallbackName: string,
  locale: string
): string {
  const names = normalizeReportOrganizationNames(reportHeader);
  const key = locale as OrganizationReportLocale;
  const localized = names[key]?.trim();
  if (localized) return localized;
  const tajik = names.tj?.trim();
  if (tajik) return tajik;
  return fallbackName;
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

export function reportHeaderWithOrganizationNames(
  reportHeader: OrganizationReportHeader | undefined,
  names: OrganizationReportNames
): OrganizationReportHeader {
  const merged = normalizeReportOrganizationNames(reportHeader);
  for (const locale of ORG_REPORT_LOCALES) {
    const value = names[locale]?.trim();
    if (value) merged[locale] = value;
    else delete merged[locale];
  }

  return {
    ...reportHeader,
    reportOrganizationNames: merged,
    reportOrganizationName: merged.tj ?? reportHeader?.reportOrganizationName,
  };
}
