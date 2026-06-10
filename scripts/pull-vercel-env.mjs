#!/usr/bin/env node
/**
 * Pulls Neon/Vercel DB env vars into .env.local for local dev.
 * Run after: npx vercel login && npx vercel link
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const envLocal = join(root, '.env.local');

try {
  execSync('npx vercel env pull .env.vercel.tmp --yes', { stdio: 'inherit' });
} catch {
  console.error('Failed. Run: npx vercel login && npx vercel link');
  process.exit(1);
}

const tmp = join(root, '.env.vercel.tmp');
if (!existsSync(tmp)) {
  console.error('No .env.vercel.tmp created');
  process.exit(1);
}

const pulled = readFileSync(tmp, 'utf8');
const existing = existsSync(envLocal) ? readFileSync(envLocal, 'utf8') : '';
const merged = `${existing.trim()}\n\n# Pulled from Vercel\n${pulled}`.trim() + '\n';
writeFileSync(envLocal, merged, 'utf8');

console.log('Merged into .env.local');
console.log('Remove .env.vercel.tmp manually if needed.');
