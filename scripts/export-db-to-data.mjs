#!/usr/bin/env node
/**
 * Export organizations + section content from Postgres into data/*.json
 * for git backup and Vercel redeploy via GitHub Actions.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim()
  );
}

function parseJson(value) {
  if (typeof value === 'string') return JSON.parse(value);
  return value;
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error('POSTGRES_URL or DATABASE_URL is required');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  const organizationRows = await sql`
    SELECT id, payload
    FROM organizations
    ORDER BY created_at ASC
  `;

  const organizations = organizationRows.map((row) => ({
    ...parseJson(row.payload),
    id: row.id,
  }));

  const sectionRows = await sql`
    SELECT organization_id, section_slug, content
    FROM organization_sections
    ORDER BY organization_id ASC, section_slug ASC
  `;

  const organizationSections = {};
  for (const row of sectionRows) {
    if (!organizationSections[row.organization_id]) {
      organizationSections[row.organization_id] = {};
    }
    organizationSections[row.organization_id][row.section_slug] = parseJson(row.content);
  }

  const dataDir = join(root, 'data');
  mkdirSync(dataDir, { recursive: true });

  writeFileSync(
    join(dataDir, 'organizations.json'),
    `${JSON.stringify(organizations, null, 2)}\n`,
    'utf-8'
  );
  writeFileSync(
    join(dataDir, 'organization-sections.json'),
    `${JSON.stringify(organizationSections, null, 2)}\n`,
    'utf-8'
  );

  console.log(
    `Exported ${organizations.length} organization(s) and ${sectionRows.length} section(s).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
