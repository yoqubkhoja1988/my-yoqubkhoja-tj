import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Organization } from '@/types/organization';
import { OrganizationSectionContent } from '@/types/organization-section';
import { DEFAULT_USER_PERMISSIONS, normalizeUserPermissions, StoredUser, UserPermissions } from '@/types/user';

let readyPromise: Promise<void> | null = null;

type SqlResult<T> = { rows: T[]; rowCount: number };

export function getDatabaseUrl(): string | undefined {
  const direct =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.STORAGE_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim();

  if (direct) return direct;

  const host = process.env.PGHOST?.trim() || process.env.PGHOST_UNPOOLED?.trim();
  const user = process.env.PGUSER?.trim();
  const password = process.env.PGPASSWORD?.trim();
  const database = process.env.PGDATABASE?.trim();

  if (host && user && password && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${database}?sslmode=require`;
  }

  return undefined;
}

export function isDatabaseEnabled(): boolean {
  return Boolean(getDatabaseUrl());
}

export async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<SqlResult<T>> {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('Database URL is not configured');
  }

  if (process.env.POSTGRES_URL?.trim()) {
    const { sql: vercelSql } = await import('@vercel/postgres');
    const result = await vercelSql(strings, ...(values as never[]));
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount ?? result.rows.length,
    };
  }

  const query = neon(connectionString);
  const rows = (await query(strings, ...values)) as T[];
  return { rows, rowCount: rows.length };
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

  await sql`
    CREATE TABLE IF NOT EXISTS user_presence (
      presence_key TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      path TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      user_id TEXT,
      guest_token TEXT,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      last_message_at TIMESTAMPTZ NOT NULL,
      telegram_notified_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  urlSource: string | null;
}> {
  if (!isDatabaseEnabled()) {
    return {
      enabled: false,
      ready: false,
      users: 0,
      organizations: 0,
      sections: 0,
      urlSource: null,
    };
  }

  const urlSource = process.env.POSTGRES_URL?.trim()
    ? 'POSTGRES_URL'
    : process.env.DATABASE_URL?.trim()
      ? 'DATABASE_URL'
      : process.env.STORAGE_URL?.trim()
        ? 'STORAGE_URL'
        : process.env.PGHOST?.trim()
          ? 'PGHOST'
          : process.env.POSTGRES_URL_NON_POOLING?.trim()
            ? 'POSTGRES_URL_NON_POOLING'
            : null;

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
      urlSource,
    };
  } catch {
    return {
      enabled: true,
      ready: false,
      users: 0,
      organizations: 0,
      sections: 0,
      urlSource,
    };
  }
}

export function parsePermissions(value: unknown): UserPermissions {
  return normalizeUserPermissions(value ?? DEFAULT_USER_PERMISSIONS);
}
