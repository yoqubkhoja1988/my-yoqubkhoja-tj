import { getOrganizationKind, OrganizationKind } from '@/lib/organization-scope';
import { VacancyNoticeInfo } from '@/types/organization-section';

type Translator = (key: string, values?: Record<string, string | number>) => string;

const LEGACY_FOOD_SAFETY_INTRO_MARKERS = [
  'Маркази таъминоти бехатарии озуқаворӣ',
  'Food Safety Center',
  'Центре обеспечения безопасности',
  'Oziq-ovqat xavfsizligini ta\'minlash markazida',
] as const;

const LEGACY_FOOD_SAFETY_REQUIREMENTS_MARKERS = [
  'бехатарии озуқаворӣ',
  'food safety',
  'безопасности пищевых продуктов',
  'oziq-ovqat xavfsizligi',
] as const;

function requirementsKey(kind: OrganizationKind | null): string {
  switch (kind) {
    case 'kindergarten_school':
      return 'vacancyNoticeDefaultRequirementsKindergarten';
    case 'food_safety_center':
      return 'vacancyNoticeDefaultRequirementsFoodSafety';
    default:
      return 'vacancyNoticeDefaultRequirementsGeneric';
  }
}

export function isLegacyFoodSafetyVacancyIntro(intro?: string): boolean {
  if (!intro?.trim()) return false;
  return LEGACY_FOOD_SAFETY_INTRO_MARKERS.some((marker) => intro.includes(marker));
}

function isLegacyFoodSafetyVacancyRequirements(requirements?: string): boolean {
  if (!requirements?.trim()) return false;
  const normalized = requirements.toLowerCase();
  return LEGACY_FOOD_SAFETY_REQUIREMENTS_MARKERS.some((marker) =>
    normalized.includes(marker.toLowerCase())
  );
}

export function buildDefaultVacancyNotice(
  t: Translator,
  organizationName: string,
  organizationId?: string
): VacancyNoticeInfo {
  const kind = getOrganizationKind(organizationId);
  return {
    intro: t('vacancyNoticeDefaultIntro', { organization: organizationName }),
    requirements: t(requirementsKey(kind)),
    publishedAt: new Date().toISOString().slice(0, 10),
  };
}

export function resolveVacancyNotice(
  notice: VacancyNoticeInfo | undefined,
  t: Translator,
  organizationName: string,
  organizationId?: string
): VacancyNoticeInfo {
  const defaults = buildDefaultVacancyNotice(t, organizationName, organizationId);
  const kind = getOrganizationKind(organizationId);

  let intro = notice?.intro?.trim();
  if (
    !intro ||
    (kind === 'kindergarten_school' && isLegacyFoodSafetyVacancyIntro(intro))
  ) {
    intro = defaults.intro;
  }

  let requirements = notice?.requirements?.trim();
  if (
    !requirements ||
    (kind === 'kindergarten_school' && isLegacyFoodSafetyVacancyRequirements(requirements))
  ) {
    requirements = defaults.requirements;
  }

  return {
    ...defaults,
    ...notice,
    intro,
    requirements,
  };
}
