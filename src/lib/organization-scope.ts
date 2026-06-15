import { FOOD_SAFETY_CENTER_ID, KINDERGARTEN_SCHOOL_ID } from '@/lib/activity-directions';
import {
  YOQUBKHOJA_INNOVATION_CENTER_ID,
  YOQUBKHOJA_INNOVATION_CENTER_NAME,
} from '@/lib/yoqubkhoja-innovation-center';
import { OrganizationSectionContent } from '@/types/organization-section';

export type OrganizationKind = 'food_safety_center' | 'kindergarten_school' | 'private_innovation_center';

export const ORGANIZATION_KIND_BY_ID: Record<string, OrganizationKind> = {
  [FOOD_SAFETY_CENTER_ID]: 'food_safety_center',
  [KINDERGARTEN_SCHOOL_ID]: 'kindergarten_school',
  [YOQUBKHOJA_INNOVATION_CENTER_ID]: 'private_innovation_center',
};

/** Маркази таъминоти бехатарии озуқаворӣ — ноҳияи Ҷ. Расулов */
export const FOOD_SAFETY_CENTER_NAME =
  'МАРКАЗИ ТАЪМИНОТИ БЕХАТАРИИ ОЗУҚОВОРИИ НОҲИЯИ ҶАББОР РАСУЛОВ';

/** МДТМ Мактаб-кӯдакистони №1 — ноҳияи Ҷ. Расулов */
export const KINDERGARTEN_SCHOOL_NAME =
  'МУАССИСАИ ДАВЛАТИИ ТАЪЛИМИИ ТОМАКТАБИИ МАКТАБ- КӮДАКИСТОНИ №1 НОҲИЯИ ҶАББОР РАСУЛОВ';

export function getOrganizationKind(organizationId?: string): OrganizationKind | null {
  if (!organizationId) return null;
  return ORGANIZATION_KIND_BY_ID[organizationId] ?? null;
}

export function isKindergartenOrganization(organizationId?: string): boolean {
  return organizationId === KINDERGARTEN_SCHOOL_ID;
}

export function isFoodSafetyCenterOrganization(organizationId?: string): boolean {
  return organizationId === FOOD_SAFETY_CENTER_ID;
}

/** Логотип дар сарлавҳаи ҳуҷҷатҳои расмӣ (чоп, PDF, Word). */
export function showOrganizationDocumentLogo(organizationId?: string): boolean {
  return (
    !isFoodSafetyCenterOrganization(organizationId) &&
    !isKindergartenOrganization(organizationId)
  );
}

export function isYoqubkhojaInnovationCenter(organizationId?: string): boolean {
  return organizationId === YOQUBKHOJA_INNOVATION_CENTER_ID;
}

export function requireOrganizationId(organizationId?: string): string {
  if (!organizationId?.trim()) {
    throw new Error('organizationId is required');
  }
  return organizationId;
}

/** Навиштаҷоти имзо — МДТМ: «Директор»; Маркази бехатарии озуқаворӣ: «Сардор». */
export const KINDERGARTEN_DIRECTOR_SIGNATURE_LABEL = 'Директор';
export const FOOD_SAFETY_DIRECTOR_SIGNATURE_LABEL = 'Сардор';
export const PRIVATE_ORGANIZATION_DIRECTOR_SIGNATURE_LABEL = 'Роҳбар';

export function getDirectorSignatureLabel(organizationId?: string): string {
  if (isKindergartenOrganization(organizationId)) {
    return KINDERGARTEN_DIRECTOR_SIGNATURE_LABEL;
  }
  if (isFoodSafetyCenterOrganization(organizationId)) {
    return FOOD_SAFETY_DIRECTOR_SIGNATURE_LABEL;
  }
  if (isYoqubkhojaInnovationCenter(organizationId)) {
    return PRIVATE_ORGANIZATION_DIRECTOR_SIGNATURE_LABEL;
  }
  return PRIVATE_ORGANIZATION_DIRECTOR_SIGNATURE_LABEL;
}

/** Меъёрҳои кӯдаkiston (Қарори №113) — танҳо барои МДТМ кӯдаkiston */
export function requireKindergartenOrganization(organizationId?: string): string {
  const id = requireOrganizationId(organizationId);
  if (!isKindergartenOrganization(id)) {
    throw new Error('Preschool wage rules apply only to the kindergarten school organization');
  }
  return id;
}

const FOOD_SAFETY_STAFF_ID_PREFIX = 'emp-';
const KINDERGARTEN_STAFF_ID_PREFIX = 'kg-emp-';

const KINDERGARTEN_STAFF_DEPARTMENTS = [
  'РОҲБАРИЯТ',
  'МУРАББИЯ',
  'ҲАМШИРАҲОИ ТИББӢ',
  'КОРМАНДОНИ ЁРИРАСОН',
  'КОРМАНДОНИ ЁРИРАСОН (ТЕХНИКӢ)',
];

const FOOD_SAFETY_STAFF_MARKERS = [
  'ветеринар',
  'фитосанитар',
  'озмоишгоҳ',
  'ҳайвонот',
  'семен',
];

/** Санҷиш: маълумоти корманд/штат ба ташкилоти дигар омехта нашавад. */
export function validateOrganizationSectionIsolation(
  organizationId: string,
  section: string,
  content: OrganizationSectionContent
): void {
  if (section !== 'staff' && section !== 'finance') return;

  const employees = content.employees ?? [];
  for (const employee of employees) {
    if (isKindergartenOrganization(organizationId)) {
      if (employee.id.startsWith(FOOD_SAFETY_STAFF_ID_PREFIX) && !employee.id.startsWith(KINDERGARTEN_STAFF_ID_PREFIX)) {
        throw new Error(
          `Корманди «${employee.fullName}» (ID: ${employee.id}) ба МДТМ кӯдаkiston тааллуқ надорад — ID-и маркази бехатарии озуқаворӣ аст`
        );
      }
    } else if (isFoodSafetyCenterOrganization(organizationId)) {
      if (employee.id.startsWith(KINDERGARTEN_STAFF_ID_PREFIX)) {
        throw new Error(
          `Корманди «${employee.fullName}» (ID: ${employee.id}) ба маркази бехатарии озуқаворӣ тааллуқ надорад — ID-и кӯдаkiston аст`
        );
      }
    }
  }

  if (section === 'staff' && isKindergartenOrganization(organizationId)) {
    for (const table of content.tables ?? []) {
      const title = table.title.toLowerCase();
      if (FOOD_SAFETY_STAFF_MARKERS.some((marker) => title.includes(marker))) {
        throw new Error(
          `Ҷадвали «${table.title}» ба маркази бехатарии озуқаворӣ тааллуқ дорад, на ба МДТМ кӯдаkiston`
        );
      }
    }
  }

  if (section === 'staff' && isFoodSafetyCenterOrganization(organizationId)) {
    for (const table of content.tables ?? []) {
      if (KINDERGARTEN_STAFF_DEPARTMENTS.includes(table.title.trim())) {
        throw new Error(
          `Ҷадвали «${table.title}» ба МДТМ кӯдаkiston тааллуқ дорад, на ба маркази бехатарии озуқаворӣ`
        );
      }
    }
  }
}
