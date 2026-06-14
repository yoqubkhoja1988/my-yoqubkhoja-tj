#!/usr/bin/env node
/**
 * Upsert Yoqubkhoja section seeds from data/yoqubkhoja-innovation-sections.json into Postgres.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

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
  process.env.POSTGRES_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim();

if (!dbUrl) {
  console.error('POSTGRES_URL not set. Run: npm run db:pull-env');
  process.exit(1);
}

const seedFile = join(root, 'data', 'yoqubkhoja-innovation-sections.json');
const seeds = JSON.parse(readFileSync(seedFile, 'utf8'));
const query = neon(dbUrl);
let count = 0;

for (const [organizationId, sections] of Object.entries(seeds)) {
  for (const [sectionSlug, content] of Object.entries(sections)) {
    await query`
      INSERT INTO organization_sections (organization_id, section_slug, content, updated_at)
      VALUES (${organizationId}, ${sectionSlug}, ${JSON.stringify(content)}::jsonb, NOW())
      ON CONFLICT (organization_id, section_slug)
      DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
    `;
    count += 1;
    console.log('section', organizationId.slice(0, 8) + '…', sectionSlug);
  }
}

console.log(`Done. Synced ${count} Yoqubkhoja section row(s).`);
