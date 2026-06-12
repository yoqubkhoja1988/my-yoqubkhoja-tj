import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Session } from 'next-auth';
import { ensureDatabaseReady, isDatabaseEnabled, sql } from '@/lib/db';
import { isSiteAdmin } from '@/lib/is-admin';
import { PublicUser } from '@/types/user';

export const PRESENCE_TTL_MS = 2 * 60 * 1000;

const FILE = join(process.cwd(), 'data', 'user-presence.json');

export type PresenceRecord = {
  presenceKey: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  lastSeenAt: string;
  path?: string;
};

export type UserPresenceStats = {
  total: number;
  approved: number;
  pending: number;
  denied: number;
  online: number;
  adminOnline: boolean;
};

export type AdminUsersOverview = {
  users: PublicUser[];
  stats: UserPresenceStats;
  onlineUserIds: string[];
};

function readPresenceFileSync(): Record<string, PresenceRecord> {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, PresenceRecord>;
  } catch {
    return {};
  }
}

function persistPresenceFileSync(records: Record<string, PresenceRecord>): void {
  const dir = dirname(FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const json = `${JSON.stringify(records, null, 2)}\n`;
  const tempFile = `${FILE}.tmp`;
  writeFileSync(tempFile, json, 'utf-8');
  renameSync(tempFile, FILE);
}

export function getPresenceKeyFromSession(session: Session): string {
  if (isSiteAdmin(session)) return 'admin';
  return session.user?.id ?? '';
}

export function isPresenceOnline(
  record: Pick<PresenceRecord, 'lastSeenAt'>,
  now = Date.now()
): boolean {
  const lastSeen = new Date(record.lastSeenAt).getTime();
  if (Number.isNaN(lastSeen)) return false;
  return now - lastSeen <= PRESENCE_TTL_MS;
}

function rowToPresenceRecord(row: {
  presence_key: string;
  username: string;
  display_name: string;
  role: string;
  last_seen_at: Date | string;
  path: string | null;
}): PresenceRecord {
  return {
    presenceKey: row.presence_key,
    username: row.username,
    displayName: row.display_name,
    role: row.role === 'admin' ? 'admin' : 'user',
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    path: row.path ?? undefined,
  };
}

async function readPresenceRecords(): Promise<PresenceRecord[]> {
  if (!isDatabaseEnabled()) {
    return Object.values(readPresenceFileSync());
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{
    presence_key: string;
    username: string;
    display_name: string;
    role: string;
    last_seen_at: Date | string;
    path: string | null;
  }>`SELECT * FROM user_presence`;

  return rows.map(rowToPresenceRecord);
}

export async function touchPresence(input: {
  presenceKey: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  path?: string;
}): Promise<void> {
  if (!input.presenceKey) return;

  const now = new Date().toISOString();
  const record: PresenceRecord = {
    presenceKey: input.presenceKey,
    username: input.username,
    displayName: input.displayName,
    role: input.role,
    lastSeenAt: now,
    path: input.path,
  };

  if (!isDatabaseEnabled()) {
    const records = readPresenceFileSync();
    records[input.presenceKey] = record;
    persistPresenceFileSync(records);
    return;
  }

  await ensureDatabaseReady();
  await sql`
    INSERT INTO user_presence (
      presence_key,
      username,
      display_name,
      role,
      last_seen_at,
      path
    )
    VALUES (
      ${record.presenceKey},
      ${record.username},
      ${record.displayName},
      ${record.role},
      ${record.lastSeenAt},
      ${record.path ?? null}
    )
    ON CONFLICT (presence_key) DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      last_seen_at = EXCLUDED.last_seen_at,
      path = EXCLUDED.path
  `;
}

export async function getOnlinePresenceRecords(): Promise<PresenceRecord[]> {
  const records = await readPresenceRecords();
  const now = Date.now();
  return records.filter((record) => isPresenceOnline(record, now));
}

export function buildUserPresenceStats(
  users: PublicUser[],
  onlineRecords: PresenceRecord[]
): UserPresenceStats {
  const onlineUserIds = new Set(
    onlineRecords.filter((record) => record.role === 'user').map((record) => record.presenceKey)
  );

  return {
    total: users.length,
    approved: users.filter((user) => user.status === 'approved').length,
    pending: users.filter((user) => user.status === 'pending').length,
    denied: users.filter((user) => user.status === 'denied').length,
    online: onlineUserIds.size + (onlineRecords.some((record) => record.role === 'admin') ? 1 : 0),
    adminOnline: onlineRecords.some((record) => record.role === 'admin'),
  };
}

export async function getAdminUsersOverview(users: PublicUser[]): Promise<AdminUsersOverview> {
  const onlineRecords = await getOnlinePresenceRecords();
  const onlineUserIds = onlineRecords
    .filter((record) => record.role === 'user')
    .map((record) => record.presenceKey);

  return {
    users,
    stats: buildUserPresenceStats(users, onlineRecords),
    onlineUserIds,
  };
}
