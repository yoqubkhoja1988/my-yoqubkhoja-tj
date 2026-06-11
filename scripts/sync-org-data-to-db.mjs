#!/usr/bin/env node
/**
 * Upsert organizations + organization_sections from data/*.json into Neon/Vercel Postgres.
 * Requires DATABASE_URL in environment (.env.local after vercel env pull).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';

const root = process.cwd();
for (const file of ['.env.local', '.env']) {
  const path = join(root, file);
  if (existsSync(path)) config({ path, override: false });
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
