import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { ensureDatabaseReady, isDatabaseEnabled, sql } from '@/lib/db';
import { OrganizationSectionContent, OrganizationSectionsMap } from '@/types/organization-section';

const FILE = join(process.cwd(), 'data', 'organization-sections.json');
const SEED_FILE = join(process.cwd(), 'data', 'yoqubkhoja-innovation-sections.json');

function readSectionSeeds(): Record<string, OrganizationSectionsMap> {
  try {
    if (!existsSync(SEED_FILE)) return {};
    const parsed = JSON.parse(readFileSync(SEED_FILE, 'utf-8'));
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function applySectionSeeds(all: Record<string, OrganizationSectionsMap>): Record<string, OrganizationSectionsMap> {
  const seeds = readSectionSeeds();
  const merged = { ...all };
  for (const [organizationId, sections] of Object.entries(seeds)) {
    merged[organizationId] = { ...sections, ...(merged[organizationId] ?? {}) };
  }
  return merged;
}

function readOrganizationSectionsSync(): Record<string, OrganizationSectionsMap> {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const base = typeof parsed === 'object' && parsed !== null ? parsed : {};
    return applySectionSeeds(base);
  } catch {
    return applySectionSeeds({});
  }
}

function persistOrganizationSectionsSync(all: Record<string, OrganizationSectionsMap>): void {
  const dir = dirname(FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const json = `${JSON.stringify(all, null, 2)}\n`;
  const tempFile = `${FILE}.tmp`;
  writeFileSync(tempFile, json, 'utf-8');
  renameSync(tempFile, FILE);
}

function parseSectionContent(value: unknown): OrganizationSectionContent {
  if (typeof value === 'string') {
    return JSON.parse(value) as OrganizationSectionContent;
  }
  return value as OrganizationSectionContent;
}

export async function readOrganizationSections(): Promise<Record<string, OrganizationSectionsMap>> {
  if (!isDatabaseEnabled()) {
    return readOrganizationSectionsSync();
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{
    organization_id: string;
    section_slug: string;
    content: OrganizationSectionContent;
  }>`SELECT organization_id, section_slug, content FROM organization_sections`;

  const all: Record<string, OrganizationSectionsMap> = {};
  for (const row of rows) {
    if (!all[row.organization_id]) {
      all[row.organization_id] = {};
    }
    all[row.organization_id][row.section_slug] = parseSectionContent(row.content);
  }
  return applySectionSeeds(all);
}

export async function getOrganizationSection(
  organizationId: string,
  slug: string
): Promise<OrganizationSectionContent | null> {
  if (!isDatabaseEnabled()) {
    const all = readOrganizationSectionsSync();
    return all[organizationId]?.[slug] ?? null;
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{ content: OrganizationSectionContent }>`
    SELECT content
    FROM organization_sections
    WHERE organization_id = ${organizationId} AND section_slug = ${slug}
    LIMIT 1
  `;

  return rows[0] ? parseSectionContent(rows[0].content) : null;
}

export async function writeOrganizationSection(
  organizationId: string,
  slug: string,
  content: OrganizationSectionContent
): Promise<OrganizationSectionContent> {
  if (!isDatabaseEnabled()) {
    const all = readOrganizationSectionsSync();
    if (!all[organizationId]) {
      all[organizationId] = {};
    }
    all[organizationId][slug] = content;
    persistOrganizationSectionsSync(all);
    return content;
  }

  await ensureDatabaseReady();
  await sql`
    INSERT INTO organization_sections (organization_id, section_slug, content, updated_at)
    VALUES (
      ${organizationId},
      ${slug},
      ${JSON.stringify(content)}::jsonb,
      NOW()
    )
    ON CONFLICT (organization_id, section_slug)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `;

  return content;
}
