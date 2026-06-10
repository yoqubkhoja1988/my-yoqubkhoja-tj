import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { OrganizationSectionContent, OrganizationSectionsMap } from '@/types/organization-section';

const FILE = join(process.cwd(), 'data', 'organization-sections.json');

export function readOrganizationSections(): Record<string, OrganizationSectionsMap> {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function getOrganizationSection(
  organizationId: string,
  slug: string
): OrganizationSectionsMap[string] | null {
  const all = readOrganizationSections();
  return all[organizationId]?.[slug] ?? null;
}

function persistOrganizationSections(all: Record<string, OrganizationSectionsMap>): void {
  const dir = dirname(FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const json = `${JSON.stringify(all, null, 2)}\n`;
  const tempFile = `${FILE}.tmp`;
  writeFileSync(tempFile, json, 'utf-8');
  renameSync(tempFile, FILE);
}

export function writeOrganizationSection(
  organizationId: string,
  slug: string,
  content: OrganizationSectionContent
): OrganizationSectionContent {
  const all = readOrganizationSections();
  if (!all[organizationId]) {
    all[organizationId] = {};
  }

  all[organizationId][slug] = content;
  persistOrganizationSections(all);
  return content;
}
