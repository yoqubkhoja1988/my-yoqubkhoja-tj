import { sql } from '@vercel/postgres';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';
import { StoredUser, UserPermissions } from '@/types/user';

let readyPromise: Promise<void> | null = null;

export function isDatabaseEnabled(): boolean {
  return Boolean(process.env.POSTGRES_URL?.trim());
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const file = join(process.cwd(), 'data', filename);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function seedFromFilesIfEmpty(): Promise<void> {
  const { rows: userCount } = await sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM users`;
  if (Number(userCount[0]?.count ?? 0) === 0) {
    const users = readJsonFile<StoredUser[]>('users.json', []);
    for (const user of users) {
      await sql`
        INSERT INTO users (id, username, password_hash, status, permissions, created_at, updated_at)
        VALUES (
          ${user.id},
          ${user.username},
          ${user.passwordHash},
          ${user.status},
          ${JSON.stringify(user.permissions)}::jsonb,
          ${user.createdAt},
          ${user.updatedAt ?? null}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  const { rows: orgCount } =
    await sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM organizations`;
  if (Number(orgCount[0]?.count ?? 0) === 0) {
    const organizations = readJsonFile<Organization[]>('organizations.json', []);
    for (const org of organizations) {
      await sql`
        INSERT INTO organizations (id, payload, created_at)
        VALUES (${org.id}, ${JSON.stringify(org)}::jsonb, ${org.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  const { rows: sectionCount } =
    await sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM organization_sections`;
  if (Number(sectionCount[0]?.count ?? 0) === 0) {
    const sectionsByOrg = readJsonFile<Record<string, Record<string, OrganizationSectionContent>>>(
      'organization-sections.json',
      {}
    );
    for (const [organizationId, sections] of Object.entries(sectionsByOrg)) {
      for (const [sectionSlug, content] of Object.entries(sections)) {
        await sql`
          INSERT INTO organization_sections (organization_id, section_slug, content)
          VALUES (${organizationId}, ${sectionSlug}, ${JSON.stringify(content)}::jsonb)
          ON CONFLICT (organization_id, section_slug) DO NOTHING
        `;
      }
    }
  }
}

async function initDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS organization_sections (
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      section_slug TEXT NOT NULL,
      content JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (organization_id, section_slug)
    )
  `;

  await seedFromFilesIfEmpty();
}

export async function ensureDatabaseReady(): Promise<void> {
  if (!isDatabaseEnabled()) return;
  if (!readyPromise) {
    readyPromise = initDatabase();
  }
  await readyPromise;
}

export async function getDatabaseStatus(): Promise<{
  enabled: boolean;
  ready: boolean;
  users: number;
  organizations: number;
  sections: number;
}> {
  if (!isDatabaseEnabled()) {
    return { enabled: false, ready: false, users: 0, organizations: 0, sections: 0 };
  }

  try {
    await ensureDatabaseReady();
    const [users, organizations, sections] = await Promise.all([
      sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM users`,
      sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM organizations`,
      sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM organization_sections`,
    ]);
    return {
      enabled: true,
      ready: true,
      users: Number(users.rows[0]?.count ?? 0),
      organizations: Number(organizations.rows[0]?.count ?? 0),
      sections: Number(sections.rows[0]?.count ?? 0),
    };
  } catch {
    return { enabled: true, ready: false, users: 0, organizations: 0, sections: 0 };
  }
}

export { sql };

export function parsePermissions(value: unknown): UserPermissions {
  if (typeof value === 'string') {
    return JSON.parse(value) as UserPermissions;
  }
  return value as UserPermissions;
}
