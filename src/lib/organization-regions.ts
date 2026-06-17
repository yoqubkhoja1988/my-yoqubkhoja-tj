import { Organization } from '@/types/organization';

export type OrganizationRegionKind =
  | 'province'
  | 'city'
  | 'district'
  | 'town'
  | 'jamoat'
  | 'other';

export type OrganizationRegion = {
  kind: OrganizationRegionKind;
  /** Номи минтақа барои намоиш (масалан «ноҳияи Ҷаббор Расулов») */
  label: string;
  sortKey: string;
};

const REGION_KIND_ORDER: Record<OrganizationRegionKind, number> = {
  province: 1,
  city: 2,
  district: 3,
  town: 4,
  jamoat: 5,
  other: 9,
};

const REGION_PREFIX: Record<Exclude<OrganizationRegionKind, 'other'>, string> = {
  province: 'вилояти',
  district: 'ноҳияи',
  city: 'шаҳри',
  town: 'шаҳраки',
  jamoat: 'ҷамоати',
};

const REGION_PATTERNS: { kind: Exclude<OrganizationRegionKind, 'other'>; re: RegExp }[] = [
  { kind: 'province', re: /вилояти\s+([^,،.\n]+)/iu },
  { kind: 'district', re: /ноҳияи\s+([^,،.\n]+)/iu },
  { kind: 'city', re: /шаҳри\s+([^,،.\n]+)/iu },
  { kind: 'town', re: /шаҳраки\s+([^,،.\n]+)/iu },
  { kind: 'jamoat', re: /ҷамоати\s+([^,،.\n]+)/iu },
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function buildRegion(
  kind: OrganizationRegionKind,
  name: string,
  label?: string
): OrganizationRegion {
  const trimmedName = normalizeWhitespace(name);
  const displayLabel =
    label?.trim() ||
    (kind !== 'other' && trimmedName
      ? `${REGION_PREFIX[kind as keyof typeof REGION_PREFIX]} ${trimmedName}`
      : trimmedName);

  return {
    kind,
    label: normalizeWhitespace(displayLabel),
    sortKey: `${kind}:${trimmedName.toLowerCase()}`,
  };
}

function parseRegionFromText(text: string): OrganizationRegion | null {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;

  for (const { kind, re } of REGION_PATTERNS) {
    const match = normalized.match(re);
    if (!match?.[1]) continue;

    const name = normalizeWhitespace(match[1]);
    const labelMatch = normalized.match(
      new RegExp(`${REGION_PREFIX[kind]}\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu')
    );
    return buildRegion(kind, name, labelMatch?.[0] ?? `${REGION_PREFIX[kind]} ${name}`);
  }

  return null;
}

/** Минтақаи сабти ташкилот аз рӯи ноҳияи андоз / суроға / ном */
export function resolveOrganizationRegion(org: Organization): OrganizationRegion {
  if (org.taxDistrict?.trim()) {
    const fromTax = parseRegionFromText(org.taxDistrict);
    if (fromTax) return fromTax;
    return buildRegion('other', org.taxDistrict, org.taxDistrict);
  }

  for (const field of [org.address, org.name]) {
    if (!field?.trim()) continue;
    const parsed = parseRegionFromText(field);
    if (parsed) return parsed;
  }

  return {
    kind: 'other',
    label: '',
    sortKey: 'other:unknown',
  };
}

export function compareOrganizationRegions(
  left: OrganizationRegion,
  right: OrganizationRegion
): number {
  const orderDiff = REGION_KIND_ORDER[left.kind] - REGION_KIND_ORDER[right.kind];
  if (orderDiff !== 0) return orderDiff;
  return left.label.localeCompare(right.label, 'tg');
}

export function getOrganizationRegionLabelKey(kind: OrganizationRegionKind): string {
  const keys: Record<OrganizationRegionKind, string> = {
    province: 'orgRegionProvince',
    city: 'orgRegionCity',
    district: 'orgRegionDistrict',
    town: 'orgRegionTown',
    jamoat: 'orgRegionJamoat',
    other: 'orgRegionOther',
  };
  return keys[kind];
}
