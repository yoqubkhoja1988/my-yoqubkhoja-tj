import { ActivityDirection } from '@/types/activity-direction';

export const FOOD_SAFETY_CENTER_ID = 'b8c5fe62-c216-410e-9dcf-c845838f0ad7';
export const KINDERGARTEN_SCHOOL_ID = '8c19df05-9925-4a55-8daf-c03d607f954c';

/**
 * Меню мувофиқи cfs.tj (Фаъолият, Хабарҳо, Маводҳо)
 * ва Положение о КПБ (самтҳои ветеринария, фитосанитария, ҳимояи растаниҳо, семеноводство).
 */
const FOOD_SAFETY_DIRECTIONS: ActivityDirection[] = [
  { slug: 'overview', icon: '🏠', labelKey: 'actOverview', groupKey: 'actGroupGeneral' },

  {
    slug: 'sectoral-programs',
    icon: '📑',
    labelKey: 'actSectoralPrograms',
    groupKey: 'actGroupActivity',
  },
  {
    slug: 'investment-projects',
    icon: '💼',
    labelKey: 'actInvestmentProjects',
    groupKey: 'actGroupActivity',
  },
  {
    slug: 'central-press',
    icon: '📰',
    labelKey: 'actCentralPress',
    groupKey: 'actGroupActivity',
  },
  {
    slug: 'list-of-enterprises',
    icon: '🏭',
    labelKey: 'actListOfEnterprises',
    groupKey: 'actGroupActivity',
  },
  {
    slug: 'list-of-services',
    icon: '📋',
    labelKey: 'actListOfServices',
    groupKey: 'actGroupActivity',
  },
  {
    slug: 'licensing',
    icon: '📄',
    labelKey: 'actLicensing',
    groupKey: 'actGroupActivity',
  },

  {
    slug: 'veterinary',
    icon: '🐄',
    labelKey: 'actVeterinary',
    groupKey: 'actGroupDirections',
  },
  {
    slug: 'phytosanitary',
    icon: '🌿',
    labelKey: 'actPhytosanitary',
    groupKey: 'actGroupDirections',
  },
  {
    slug: 'plant-protection',
    icon: '🛡️',
    labelKey: 'actPlantProtection',
    groupKey: 'actGroupDirections',
  },
  {
    slug: 'seed-production',
    icon: '🌾',
    labelKey: 'actSeedProduction',
    groupKey: 'actGroupDirections',
  },
  {
    slug: 'breeding-supervision',
    icon: '🧬',
    labelKey: 'actBreedingSupervision',
    groupKey: 'actGroupDirections',
  },

  { slug: 'news', icon: '📢', labelKey: 'actNews', groupKey: 'actGroupInfo' },
  { slug: 'photogallery', icon: '📷', labelKey: 'actPhotogallery', groupKey: 'actGroupInfo' },
  { slug: 'magazine', icon: '📖', labelKey: 'actMagazine', groupKey: 'actGroupInfo' },
  { slug: 'videos', icon: '🎬', labelKey: 'actVideos', groupKey: 'actGroupInfo' },

  { slug: 'reception', icon: '✉️', labelKey: 'actReception', groupKey: 'actGroupAppeals' },

  { slug: 'staff', icon: '👥', labelKey: 'actStaff', groupKey: 'actGroupAdmin' },
  { slug: 'legal', icon: '⚖️', labelKey: 'actLegal', groupKey: 'actGroupAdmin' },
  { slug: 'finance', icon: '💰', labelKey: 'actFinance', groupKey: 'actGroupAdmin' },
  {
    slug: 'formation-report',
    icon: '📋',
    labelKey: 'actFormationReport',
    groupKey: 'actGroupAdmin',
  },
  { slug: 'reports', icon: '📈', labelKey: 'actReports', groupKey: 'actGroupAdmin' },
];

/**
 * Меню мувофиқи:
 * — Қонуни ҶТ «Дар бораи таълиму тарбияи томактабӣ» (№1056, 2013);
 * — Низомномаи намунавии МДТ (Қарори Ҳукумат, №256, 29.04.2015);
 * — Стандарти давлатии таҳсилоти томактабӣ;
 * — оинномаи МДТМ Мактаб-кӯдакистони №1 ноҳияи Ҷаббор Расулов.
 */
const KINDERGARTEN_SCHOOL_DIRECTIONS: ActivityDirection[] = [
  { slug: 'overview', icon: '🏠', labelKey: 'actOverview', groupKey: 'actGroupGeneral' },

  { slug: 'charter', icon: '📜', labelKey: 'actCharter', groupKey: 'actGroupCharterLegal' },
  { slug: 'licensing', icon: '📄', labelKey: 'actLicensing', groupKey: 'actGroupCharterLegal' },
  { slug: 'legal', icon: '⚖️', labelKey: 'actLegal', groupKey: 'actGroupCharterLegal' },

  {
    slug: 'education-standard',
    icon: '📐',
    labelKey: 'actEducationStandard',
    groupKey: 'actGroupEducation',
  },
  {
    slug: 'education-programs',
    icon: '📚',
    labelKey: 'actEducationPrograms',
    groupKey: 'actGroupEducation',
  },
  { slug: 'work-plan', icon: '🗓️', labelKey: 'actWorkPlan', groupKey: 'actGroupEducation' },
  { slug: 'methodology', icon: '🎓', labelKey: 'actMethodology', groupKey: 'actGroupEducation' },

  { slug: 'governance', icon: '🏛️', labelKey: 'actGovernance', groupKey: 'actGroupGovernance' },
  {
    slug: 'state-supervision',
    icon: '🔍',
    labelKey: 'actStateSupervision',
    groupKey: 'actGroupGovernance',
  },

  { slug: 'age-groups', icon: '👶', labelKey: 'actAgeGroups', groupKey: 'actGroupSubjects' },
  { slug: 'enrollees', icon: '🧒', labelKey: 'actEnrollees', groupKey: 'actGroupSubjects' },
  { slug: 'parent-work', icon: '👨‍👩‍👧', labelKey: 'actParentWork', groupKey: 'actGroupSubjects' },
  {
    slug: 'medical-service',
    icon: '🏥',
    labelKey: 'actMedicalService',
    groupKey: 'actGroupSubjects',
  },
  { slug: 'nutrition', icon: '🍽️', labelKey: 'actNutrition', groupKey: 'actGroupSubjects' },

  {
    slug: 'material-base',
    icon: '🏗️',
    labelKey: 'actMaterialBase',
    groupKey: 'actGroupMaterialFinance',
  },
  { slug: 'staff', icon: '👥', labelKey: 'actStaff', groupKey: 'actGroupMaterialFinance' },
  { slug: 'finance', icon: '💰', labelKey: 'actFinance', groupKey: 'actGroupMaterialFinance' },
  {
    slug: 'formation-report',
    icon: '📋',
    labelKey: 'actFormationReport',
    groupKey: 'actGroupMaterialFinance',
  },
  { slug: 'reports', icon: '📈', labelKey: 'actReports', groupKey: 'actGroupMaterialFinance' },

  { slug: 'news', icon: '📢', labelKey: 'actNews', groupKey: 'actGroupInfo' },
  { slug: 'photogallery', icon: '📷', labelKey: 'actPhotogallery', groupKey: 'actGroupInfo' },
  { slug: 'videos', icon: '🎬', labelKey: 'actVideos', groupKey: 'actGroupInfo' },

  { slug: 'reception', icon: '✉️', labelKey: 'actReception', groupKey: 'actGroupAppeals' },
];

const DIRECTIONS_BY_ORG: Record<string, ActivityDirection[]> = {
  [FOOD_SAFETY_CENTER_ID]: FOOD_SAFETY_DIRECTIONS,
  [KINDERGARTEN_SCHOOL_ID]: KINDERGARTEN_SCHOOL_DIRECTIONS,
};

export function getActivityDirections(organizationId: string): ActivityDirection[] {
  return (
    DIRECTIONS_BY_ORG[organizationId] ?? [
      { slug: 'overview', icon: '🏠', labelKey: 'actOverview', groupKey: 'actGroupGeneral' },
    ]
  );
}

export function getActivityDirection(
  organizationId: string,
  slug: string
): ActivityDirection | undefined {
  return getActivityDirections(organizationId).find((item) => item.slug === slug);
}

export function groupActivityDirections(
  directions: ActivityDirection[]
): { groupKey: string; items: ActivityDirection[] }[] {
  const groups: { groupKey: string; items: ActivityDirection[] }[] = [];

  directions.forEach((direction) => {
    const existing = groups.find((group) => group.groupKey === direction.groupKey);
    if (existing) {
      existing.items.push(direction);
    } else {
      groups.push({ groupKey: direction.groupKey, items: [direction] });
    }
  });

  return groups;
}

export const ALL_SECTION_SLUGS = Array.from(
  new Set(
    [...FOOD_SAFETY_DIRECTIONS, ...KINDERGARTEN_SCHOOL_DIRECTIONS].map((item) => item.slug)
  )
);
