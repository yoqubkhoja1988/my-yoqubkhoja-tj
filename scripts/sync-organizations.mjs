import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

function loadEnvLocal() {
  try {
    const raw = readFileSync('.env.local', 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnvLocal();
const dbUrl =
  process.env.POSTGRES_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim();
const query = neon(dbUrl);

const organizations = JSON.parse(readFileSync('data/organizations.json', 'utf8'));
const synced = [];

for (const org of organizations) {
  const rows = await query`
    INSERT INTO organizations (id, payload, created_at)
    VALUES (${org.id}, ${JSON.stringify(org)}::jsonb, ${org.createdAt})
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
    RETURNING id
  `;
  if (rows[0]) synced.push(rows[0].id);
}

console.log(JSON.stringify({ syncedCount: synced.length, ids: synced }, null, 2));
