import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  ensureDatabaseReady,
  isDatabaseEnabled,
  parsePermissions,
  sql,
} from '@/lib/db';
import {
  DEFAULT_USER_PERMISSIONS,
  PublicUser,
  StoredUser,
  UserPermissions,
  UserStatus,
} from '@/types/user';

const FILE = join(process.cwd(), 'data', 'users.json');

function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

function readUsersFileSync(): StoredUser[] {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistUsersSync(users: StoredUser[]): void {
  const dir = dirname(FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const json = `${JSON.stringify(users, null, 2)}\n`;
  const tempFile = `${FILE}.tmp`;
  writeFileSync(tempFile, json, 'utf-8');
  renameSync(tempFile, FILE);
}

function rowToStoredUser(row: {
  id: string;
  username: string;
  password_hash: string;
  status: string;
  permissions: unknown;
  created_at: Date | string;
  updated_at: Date | string | null;
}): StoredUser {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    status: row.status as UserStatus,
    permissions: parsePermissions(row.permissions),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function readUsersFile(): Promise<StoredUser[]> {
  if (!isDatabaseEnabled()) {
    return readUsersFileSync();
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{
    id: string;
    username: string;
    password_hash: string;
    status: string;
    permissions: unknown;
    created_at: Date | string;
    updated_at: Date | string | null;
  }>`SELECT * FROM users ORDER BY created_at ASC`;

  return rows.map(rowToStoredUser);
}

export async function findUserByUsername(username: string): Promise<StoredUser | undefined> {
  const normalized = username.trim().toLowerCase();

  if (!isDatabaseEnabled()) {
    return readUsersFileSync().find((user) => user.username.toLowerCase() === normalized);
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{
    id: string;
    username: string;
    password_hash: string;
    status: string;
    permissions: unknown;
    created_at: Date | string;
    updated_at: Date | string | null;
  }>`SELECT * FROM users WHERE LOWER(username) = ${normalized} LIMIT 1`;

  return rows[0] ? rowToStoredUser(rows[0]) : undefined;
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  if (!isDatabaseEnabled()) {
    return readUsersFileSync().find((user) => user.id === id);
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{
    id: string;
    username: string;
    password_hash: string;
    status: string;
    permissions: unknown;
    created_at: Date | string;
    updated_at: Date | string | null;
  }>`SELECT * FROM users WHERE id = ${id} LIMIT 1`;

  return rows[0] ? rowToStoredUser(rows[0]) : undefined;
}

export async function listPublicUsers(): Promise<PublicUser[]> {
  const users = await readUsersFile();
  return users.map(toPublicUser);
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  status?: UserStatus;
  permissions?: UserPermissions;
}): Promise<PublicUser> {
  const username = input.username.trim();
  const existing = await findUserByUsername(username);
  if (existing) {
    throw new Error('USERNAME_EXISTS');
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    id: randomUUID(),
    username,
    passwordHash: input.passwordHash,
    status: input.status ?? 'pending',
    permissions: input.permissions ?? { ...DEFAULT_USER_PERMISSIONS },
    createdAt: now,
  };

  if (!isDatabaseEnabled()) {
    const users = readUsersFileSync();
    users.push(user);
    persistUsersSync(users);
    return toPublicUser(user);
  }

  await ensureDatabaseReady();
  await sql`
    INSERT INTO users (id, username, password_hash, status, permissions, created_at)
    VALUES (
      ${user.id},
      ${user.username},
      ${user.passwordHash},
      ${user.status},
      ${JSON.stringify(user.permissions)}::jsonb,
      ${user.createdAt}
    )
  `;

  return toPublicUser(user);
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<StoredUser, 'status' | 'permissions' | 'passwordHash'>>
): Promise<PublicUser | null> {
  const current = await findUserById(id);
  if (!current) return null;

  const updated: StoredUser = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (!isDatabaseEnabled()) {
    const users = readUsersFileSync();
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;
    users[index] = updated;
    persistUsersSync(users);
    return toPublicUser(updated);
  }

  await ensureDatabaseReady();
  await sql`
    UPDATE users
    SET
      status = ${updated.status},
      permissions = ${JSON.stringify(updated.permissions)}::jsonb,
      password_hash = ${updated.passwordHash},
      updated_at = ${updated.updatedAt ?? null}
    WHERE id = ${id}
  `;

  return toPublicUser(updated);
}

export async function deleteUser(id: string): Promise<boolean> {
  if (!isDatabaseEnabled()) {
    const users = readUsersFileSync();
    const next = users.filter((user) => user.id !== id);
    if (next.length === users.length) return false;
    persistUsersSync(next);
    return true;
  }

  await ensureDatabaseReady();
  const result = await sql`DELETE FROM users WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}
