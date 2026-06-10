import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
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

export function readUsersFile(): StoredUser[] {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistUsers(users: StoredUser[]): void {
  const dir = dirname(FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const json = `${JSON.stringify(users, null, 2)}\n`;
  const tempFile = `${FILE}.tmp`;
  writeFileSync(tempFile, json, 'utf-8');
  renameSync(tempFile, FILE);
}

export function findUserByUsername(username: string): StoredUser | undefined {
  const normalized = username.trim().toLowerCase();
  return readUsersFile().find((user) => user.username.toLowerCase() === normalized);
}

export function findUserById(id: string): StoredUser | undefined {
  return readUsersFile().find((user) => user.id === id);
}

export function listPublicUsers(): PublicUser[] {
  return readUsersFile().map(toPublicUser);
}

export function createUser(input: {
  username: string;
  passwordHash: string;
  status?: UserStatus;
  permissions?: UserPermissions;
}): PublicUser {
  const users = readUsersFile();
  const username = input.username.trim();

  if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
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

  users.push(user);
  persistUsers(users);
  return toPublicUser(user);
}

export function updateUser(
  id: string,
  patch: Partial<Pick<StoredUser, 'status' | 'permissions' | 'passwordHash'>>
): PublicUser | null {
  const users = readUsersFile();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  persistUsers(users);
  return toPublicUser(users[index]);
}

export function deleteUser(id: string): boolean {
  const users = readUsersFile();
  const next = users.filter((user) => user.id !== id);
  if (next.length === users.length) return false;
  persistUsers(next);
  return true;
}
