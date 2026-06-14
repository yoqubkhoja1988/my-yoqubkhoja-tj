#!/usr/bin/env node
/**
 * Sync users from data/users.json into Postgres (permissions, status).
 * Does not change passwords unless --with-password is passed.
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

const withPassword = process.argv.includes('--with-password');
const users = JSON.parse(readFileSync(join(root, 'data', 'users.json'), 'utf8'));
const query = neon(dbUrl);

for (const user of users) {
  const permissions = JSON.stringify(user.permissions);
  const updatedAt = user.updatedAt ?? new Date().toISOString();

  if (withPassword) {
    await query`
      INSERT INTO users (id, username, password_hash, status, permissions, created_at, updated_at)
      VALUES (
        ${user.id},
        ${user.username},
        ${user.passwordHash},
        ${user.status},
        ${permissions}::jsonb,
        ${user.createdAt},
        ${updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status,
        permissions = EXCLUDED.permissions,
        updated_at = EXCLUDED.updated_at
    `;
  } else {
    await query`
      INSERT INTO users (id, username, password_hash, status, permissions, created_at, updated_at)
      VALUES (
        ${user.id},
        ${user.username},
        ${user.passwordHash},
        ${user.status},
        ${permissions}::jsonb,
        ${user.createdAt},
        ${updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        status = EXCLUDED.status,
        permissions = EXCLUDED.permissions,
        updated_at = EXCLUDED.updated_at
    `;
  }

  const sectionSlugs = user.permissions?.sectionSlugs ?? [];
  console.log(
    `synced ${user.username}: ${sectionSlugs.length} section(s)` +
      (sectionSlugs.includes('organization-contracts') ? ' [organization-contracts ✓]' : '')
  );
}

console.log(`Done. Synced ${users.length} user(s).`);
