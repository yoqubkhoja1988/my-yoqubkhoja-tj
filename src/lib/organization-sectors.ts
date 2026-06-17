import { Organization, OrganizationSectorId } from '@/types/organization';
import {
  OrganizationRegion,
  compareOrganizationRegions,
  resolveOrganizationRegion,
} from '@/lib/organization-regions';

/** Соҳаҳои гуруҳбандии ташкилотҳо мувофиқи сохтори иқтисодии Ҷумҳурии Тоҷикистон */
export const ORGANIZATION_SECTORS = [
  {
    id: 'state-governance',
    icon: '🏛️',
    labelKey: 'orgSectorStateGovernance',
    descKey: 'orgSectorStateGovernanceDesc',
    order: 1,
  },
  {
    id: 'ministries-agencies',
    icon: '🏢',
    labelKey: 'orgSectorMinistries',
    descKey: 'orgSectorMinistriesDesc',
    order: 2,
  },
  {
    id: 'local-government',
    icon: '🗺️',
    labelKey: 'orgSectorLocalGov',
    descKey: 'orgSectorLocalGovDesc',
    order: 3,
  },
  {
    id: 'education',
    icon: '📚',
    labelKey: 'orgSectorEducation',
    descKey: 'orgSectorEducationDesc',
    order: 4,
  },
  {
    id: 'healthcare',
    icon: '🏥',
    labelKey: 'orgSectorHealthcare',
    descKey: 'orgSectorHealthcareDesc',
    order: 5,
  },
  {
    id: 'social-protection',
    icon: '🤝',
    labelKey: 'orgSectorSocial',
    descKey: 'orgSectorSocialDesc',
    order: 6,
  },
  {
    id: 'agriculture-food',
    icon: '🌾',
    labelKey: 'orgSectorAgricultureFood',
    descKey: 'orgSectorAgricultureFoodDesc',
    order: 7,
  },
  {
    id: 'industry-energy',
    icon: '⚙️',
    labelKey: 'orgSectorIndustry',
    descKey: 'orgSectorIndustryDesc',
    order: 8,
  },
  {
    id: 'finance-economy',
    icon: '💰',
    labelKey: 'orgSectorFinance',
    descKey: 'orgSectorFinanceDesc',
    order: 9,
  },
  {
    id: 'transport-communications',
    icon: '🚆',
    labelKey: 'orgSectorTransport',
    descKey: 'orgSectorTransportDesc',
    order: 10,
  },
  {
    id: 'justice-security',
    icon: '⚖️',
    labelKey: 'orgSectorJustice',
    descKey: 'orgSectorJusticeDesc',
    order: 11,
  },
  {
    id: 'culture-sports',
    icon: '🎭',
    labelKey: 'orgSectorCulture',
    descKey: 'orgSectorCultureDesc',
    order: 12,
  },
  {
    id: 'science-innovation',
    icon: '🔬',
    labelKey: 'orgSectorScience',
    descKey: 'orgSectorScienceDesc',
    order: 13,
  },
] as const;

export const ORGANIZATION_SECTOR_IDS: OrganizationSectorId[] = ORGANIZATION_SECTORS.map(
  (sector) => sector.id
);

export type OrganizationSectorGroupId = OrganizationSectorId | 'uncategorized';

export function getOrganizationSectorMeta(sectorId: OrganizationSectorGroupId) {
  if (sectorId === 'uncategorized') {
    return {
      id: 'uncategorized' as const,
      icon: '📂',
      labelKey: 'orgSectorUncategorized',
      descKey: 'orgSectorUncategorizedDesc',
      order: 99,
    };
  }
  return ORGANIZATION_SECTORS.find((sector) => sector.id === sectorId);
}

export function isOrganizationSectorId(value: string): value is OrganizationSectorId {
  return ORGANIZATION_SECTOR_IDS.includes(value as OrganizationSectorId);
}

/** Ташхиси соҳа аз рӯи ном, агар дар сабт интихоб нашуда бошад */
export function inferOrganizationSector(org: Organization): OrganizationSectorGroupId {
  if (org.sector && isOrganizationSectorId(org.sector)) {
    return org.sector;
  }

  const name = org.name.toLowerCase();

  if (/маҷлис|ҳукумат|президент|идоракунии давлат/.test(name)) return 'state-governance';
  if (/вазорат|агенти|кумита|идораи давлат/.test(name)) return 'ministries-agencies';
  if (/ноҳия|шаҳрак|шаҳрвандӣ|маҳалла|ҷамоат/.test(name)) return 'local-government';
  if (/таълим|тарбия|мактаб|кӯдакистон|донишгоҳ|лисей|коллеҷ|муассисаи таълим/.test(name)) {
    return 'education';
  }
  if (/беморхона|поликлиника|соғлон|тиб|даъвогар/.test(name)) return 'healthcare';
  if (/иҷтимоӣ|пенсия|нафақа|кормандони иҷтимоӣ/.test(name)) return 'social-protection';
  if (/озуқаворӣ|кишоварз|ветеринар|зироат|беҳатарии озуқаворӣ/.test(name)) {
    return 'agriculture-food';
  }
  if (/саноат|завод|корхона|энергетик|шахт/.test(name)) return 'industry-energy';
  if (/молия|бонк|андоз|иқтисод|сармоягузор/.test(name)) return 'finance-economy';
  if (/нақлиёт|алоқа|почта|роҳ/.test(name)) return 'transport-communications';
  if (/адлия|прокуратура|милиция|амният|дод/.test(name)) return 'justice-security';
  if (/фарҳанг|варзиш|театр|китобхона|музей/.test(name)) return 'culture-sports';
  if (/илм|таҳқиқот|инноватсия|лаборотор/.test(name)) return 'science-innovation';

  return 'uncategorized';
}

export type OrganizationSectorGroup = {
  id: OrganizationSectorGroupId;
  organizations: Organization[];
};

export type OrganizationRegionGroup = {
  region: OrganizationRegion;
  organizations: Organization[];
};

export type OrganizationSectorRegionGroup = {
  id: OrganizationSectorGroupId;
  regions: OrganizationRegionGroup[];
};

export function groupOrganizationsBySector(organizations: Organization[]): OrganizationSectorGroup[] {
  const buckets = new Map<OrganizationSectorGroupId, Organization[]>();

  for (const org of organizations) {
    const sectorId = inferOrganizationSector(org);
    const list = buckets.get(sectorId) ?? [];
    list.push(org);
    buckets.set(sectorId, list);
  }

  const orderedIds: OrganizationSectorGroupId[] = [
    ...ORGANIZATION_SECTORS.map((sector) => sector.id),
    'uncategorized',
  ];

  return orderedIds
    .map((id) => ({
      id,
      organizations: (buckets.get(id) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'tg')),
    }))
    .filter((group) => group.organizations.length > 0);
}

export function groupOrganizationsBySectorAndRegion(
  organizations: Organization[]
): OrganizationSectorRegionGroup[] {
  const sectorBuckets = new Map<
    OrganizationSectorGroupId,
    Map<string, OrganizationRegionGroup>
  >();

  for (const org of organizations) {
    const sectorId = inferOrganizationSector(org);
    const region = resolveOrganizationRegion(org);
    const sectorMap = sectorBuckets.get(sectorId) ?? new Map<string, OrganizationRegionGroup>();
    const existing = sectorMap.get(region.sortKey);

    if (existing) {
      existing.organizations.push(org);
    } else {
      sectorMap.set(region.sortKey, { region, organizations: [org] });
    }

    sectorBuckets.set(sectorId, sectorMap);
  }

  const orderedIds: OrganizationSectorGroupId[] = [
    ...ORGANIZATION_SECTORS.map((sector) => sector.id),
    'uncategorized',
  ];

  return orderedIds
    .map((id) => {
      const sectorMap = sectorBuckets.get(id);
      if (!sectorMap) return null;

      const regions = [...sectorMap.values()]
        .map((group) => ({
          region: group.region,
          organizations: group.organizations.sort((a, b) =>
            a.name.localeCompare(b.name, 'tg')
          ),
        }))
        .sort((left, right) => compareOrganizationRegions(left.region, right.region));

      if (regions.length === 0) return null;
      return { id, regions };
    })
    .filter((group): group is OrganizationSectorRegionGroup => group !== null);
}

export function countOrganizationsInSectorRegionGroup(
  group: OrganizationSectorRegionGroup
): number {
  return group.regions.reduce((sum, region) => sum + region.organizations.length, 0);
}
