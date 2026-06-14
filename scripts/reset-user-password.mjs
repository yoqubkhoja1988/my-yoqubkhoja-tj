import { createHash, randomBytes } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
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
    // local env optional
  }
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim()
  );
}

function generatePassword() {
  const token = randomBytes(4).toString('hex');
  return `Asil${token}!`;
}

function readLocalUser(username) {
  const users = JSON.parse(readFileSync('data/users.json', 'utf8'));
  return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null;
}

loadEnvLocal();

const username = (process.argv[2] || 'asilamoh').trim();
const explicitPassword = process.argv[3]?.trim();
const localUser = readLocalUser(username);
const password =
  explicitPassword && explicitPassword.length >= 6
    ? explicitPassword
    : explicitPassword === undefined && localUser
      ? generatePassword()
      : generatePassword();
const passwordHash = hashPassword(password);
const dbUrl = getDatabaseUrl();

async function upsertDatabase(userRecord) {
  if (!dbUrl) return null;
  const query = neon(dbUrl);

  const updated = await query`
    UPDATE users
    SET
      password_hash = ${passwordHash},
      status = ${userRecord.status},
      permissions = ${JSON.stringify(userRecord.permissions)}::jsonb,
      updated_at = NOW()
    WHERE LOWER(username) = LOWER(${username})
    RETURNING id, username
  `;

  if (updated.length > 0) return updated[0];

  const inserted = await query`
    INSERT INTO users (id, username, password_hash, status, permissions, created_at, updated_at)
    VALUES (
      ${userRecord.id},
      ${userRecord.username},
      ${passwordHash},
      ${userRecord.status},
      ${JSON.stringify(userRecord.permissions)}::jsonb,
      ${userRecord.createdAt},
      NOW()
    )
    ON CONFLICT (username) DO UPDATE
    SET
      password_hash = EXCLUDED.password_hash,
      status = EXCLUDED.status,
      permissions = EXCLUDED.permissions,
      updated_at = NOW()
    RETURNING id, username
  `;

  return inserted[0] ?? null;
}

function updateUsersJson() {
  const file = 'data/users.json';
  const users = JSON.parse(readFileSync(file, 'utf8'));
  const index = users.findIndex((user) => user.username.toLowerCase() === username.toLowerCase());
  if (index === -1) return false;
  users[index].passwordHash = passwordHash;
  users[index].updatedAt = new Date().toISOString();
  writeFileSync(file, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
  return true;
}

async function main() {
  if (!localUser) {
    console.error(`User "${username}" not found in data/users.json`);
    process.exit(1);
  }

  const dbResult = await upsertDatabase(localUser);
  const fileResult = updateUsersJson();

  if (!dbResult && !fileResult) {
    console.error(`Failed to sync user "${username}"`);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        username,
        password,
        updatedDatabase: Boolean(dbResult),
        updatedUsersJson: fileResult,
        userId: dbResult?.id ?? localUser.id,
        action: dbResult ? 'upserted' : 'file-only',
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
