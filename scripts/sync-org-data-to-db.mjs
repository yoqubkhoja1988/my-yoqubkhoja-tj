#!/usr/bin/env node
/**
 * Upsert organizations + organization_sections from data/*.json into Neon/Vercel Postgres.
 * Requires DATABASE_URL in environment (.env.local after vercel env pull).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const root = process.cwd();
for (const file of ['.env.local', '.env']) {
  loadEnvFile(join(root, file));
}

const dbUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.NEON_DATABASE_URL?.trim();

if (!dbUrl) {
  console.error('DATABASE_URL not set. Run: npm run db:pull-env');
  process.exit(1);
}

const { neon } = await import('@neondatabase/serverless');
const sql = neon(dbUrl);

const organizations = JSON.parse(
  readFileSync(join(root, 'data', 'organizations.json'), 'utf8')
);
const sectionsByOrg = JSON.parse(
  readFileSync(join(root, 'data', 'organization-sections.json'), 'utf8')
);

for (const org of organizations) {
  await sql`
    INSERT INTO organizations (id, payload, created_at)
    VALUES (${org.id}, ${JSON.stringify(org)}::jsonb, ${org.createdAt})
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
  `;
  console.log('org', org.id, org.name.slice(0, 40) + '…');
}

let sectionCount = 0;
for (const [organizationId, sections] of Object.entries(sectionsByOrg)) {
  for (const [sectionSlug, content] of Object.entries(sections)) {
    await sql`
      INSERT INTO organization_sections (organization_id, section_slug, content, updated_at)
      VALUES (${organizationId}, ${sectionSlug}, ${JSON.stringify(content)}::jsonb, NOW())
      ON CONFLICT (organization_id, section_slug)
      DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
    `;
    sectionCount += 1;
  }
}

console.log(`Synced ${organizations.length} org(s), ${sectionCount} section row(s).`);
