import { hashPassword } from '@/lib/password-hash';

const DEFAULT_PASSWORD_HASH =
  'fc30043c381b6e6c79faae8309f4484ab9317a58ae4afaa328b5e926f350878f';

function cleanEnv(value: string | undefined): string {
  return value?.trim().replace(/^["']|["']$/g, '') ?? '';
}

export function getAdminUsername(): string {
  return cleanEnv(process.env.AUTH_USERNAME) || 'yoqub';
}

export function getAdminPasswordHash(): string {
  return cleanEnv(process.env.AUTH_PASSWORD_HASH) || DEFAULT_PASSWORD_HASH;
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const normalizedUsername = username.trim().toLowerCase();
  const expectedUsername = getAdminUsername().toLowerCase();
  if (normalizedUsername !== expectedUsername) return false;
  return hashPassword(password) === getAdminPasswordHash();
}

export function isAuthSecretConfigured(): boolean {
  return Boolean(cleanEnv(process.env.AUTH_SECRET));
}
