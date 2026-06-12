import {
  FOOD_SAFETY_CENTER_ID,
  KINDERGARTEN_SCHOOL_ID,
} from '@/lib/activity-directions';
import {
  getAllOfficialLegalOrganizationIds,
  getOfficialLegalBundle,
  LEGAL_SECTION_SLUGS,
} from '@/lib/official-legal-catalog';
import {
  getOrganizationSection,
  writeOrganizationSection,
} from '@/lib/organization-sections-store';
import { officialEntryToSectionItem } from '@/types/official-legal';
import { OrganizationSectionContent } from '@/types/organization-section';

const ORG_IDS_TO_SYNC = [FOOD_SAFETY_CENTER_ID, KINDERGARTEN_SCHOOL_ID];

const SECTION_SUMMARIES: Record<string, Record<string, string>> = {
  [FOOD_SAFETY_CENTER_ID]: {
    [LEGAL_SECTION_SLUGS.laws]:
      'Қонунҳои амалкунанда дар соҳаи бехатарии озуқаворӣ — манбаъҳои расмии Маҷлиси Оли ва базаи қонунгузорӣ.',
    [LEGAL_SECTION_SLUGS.decisions]:
      'Қарорҳои Ҳукумати Ҷумҳурии Тоҷикистон — манбаъҳои расмии cfs.tj ва сомонаҳои давлатӣ.',
    [LEGAL_SECTION_SLUGS.documents]:
      'Санадҳои меъёрии ҳуқуқӣ, стандартҳо ва ҳуҷҷатҳои ташкилотӣ — аз сомонаҳои расмӣ.',
  },
  [KINDERGARTEN_SCHOOL_ID]: {
    [LEGAL_SECTION_SLUGS.laws]:
      'Қонунҳои амалкунанда дар соҳаи таълиму тарбияи томактабӣ — манбаъҳои расмии Маҷлиси Оли.',
    [LEGAL_SECTION_SLUGS.decisions]:
      'Қарорҳои Ҳукумати Ҷумҳурии Тоҷикистон оид ба таълими томактабӣ — манбаъҳои расмии edu.tj.',
    [LEGAL_SECTION_SLUGS.documents]:
      'Санадҳои таъсисӣ, иҷозатнома ва ҳуҷҷатҳои назорати давлатӣ — манбаъҳои расмӣ.',
  },
};

function buildSectionContent(
  organizationId: string,
  slug: string,
  items: ReturnType<typeof officialEntryToSectionItem>[]
): OrganizationSectionContent {
  return {
    summary: SECTION_SUMMARIES[organizationId]?.[slug] ?? 'Ҳуҷҷатҳои расмӣ аз сомонаҳои давлатӣ.',
    items,
  };
}

export async function syncOfficialLegalForOrganization(
  organizationId: string
): Promise<{ updated: string[] }> {
  const bundle = getOfficialLegalBundle(organizationId);
  if (!bundle || !ORG_IDS_TO_SYNC.includes(organizationId)) {
    return { updated: [] };
  }

  const updates: string[] = [];

  const sections = [
    { slug: LEGAL_SECTION_SLUGS.laws, entries: bundle.laws },
    { slug: LEGAL_SECTION_SLUGS.decisions, entries: bundle.decisions },
    { slug: LEGAL_SECTION_SLUGS.documents, entries: bundle.documents },
  ] as const;

  for (const { slug, entries } of sections) {
    const items = entries.map(officialEntryToSectionItem);
    const content = buildSectionContent(organizationId, slug, items);
    await writeOrganizationSection(organizationId, slug, content);
    updates.push(slug);
  }

  return { updated: updates };
}

export async function syncAllOfficialLegal(): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};

  for (const orgId of ORG_IDS_TO_SYNC) {
    const { updated } = await syncOfficialLegalForOrganization(orgId);
    result[orgId] = updated;
  }

  return result;
}

export async function verifyOfficialUrls(
  organizationId: string
): Promise<{ id: string; ok: boolean; status?: number }[]> {
  const bundle = getOfficialLegalBundle(organizationId);
  if (!bundle) return [];

  const all = [...bundle.laws, ...bundle.decisions, ...bundle.documents];
  const results: { id: string; ok: boolean; status?: number }[] = [];

  for (const entry of all) {
    try {
      const response = await fetch(entry.officialUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'YoqubkhojaHub/1.0' },
      });
      results.push({
        id: entry.id,
        ok: response.ok || response.status === 405 || response.status === 403,
        status: response.status,
      });
    } catch {
      try {
        const response = await fetch(entry.officialUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'YoqubkhojaHub/1.0' },
        });
        results.push({ id: entry.id, ok: response.ok, status: response.status });
      } catch {
        results.push({ id: entry.id, ok: false });
      }
    }
  }

  return results;
}

export async function ensureOfficialLegalSectionsSeeded(): Promise<void> {
  for (const orgId of ORG_IDS_TO_SYNC) {
    const bundle = getOfficialLegalBundle(orgId);
    if (!bundle) continue;

    const sections = [
      { slug: LEGAL_SECTION_SLUGS.laws, entries: bundle.laws },
      { slug: LEGAL_SECTION_SLUGS.decisions, entries: bundle.decisions },
      { slug: LEGAL_SECTION_SLUGS.documents, entries: bundle.documents },
    ] as const;

    for (const { slug, entries } of sections) {
      const existing = await getOrganizationSection(orgId, slug);
      if (existing?.items && existing.items.length > 0) continue;

      const items = entries.map(officialEntryToSectionItem);
      const content = buildSectionContent(orgId, slug, items);
      await writeOrganizationSection(orgId, slug, content);
    }
  }
}

export function listSyncableOrganizationIds(): string[] {
  return getAllOfficialLegalOrganizationIds().filter((id) => ORG_IDS_TO_SYNC.includes(id));
}
