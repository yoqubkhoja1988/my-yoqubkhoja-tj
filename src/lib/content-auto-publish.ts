/**
 * After app data is saved to Postgres, trigger GitHub Actions to export JSON,
 * commit/push to main, and let Vercel deploy from the push.
 *
 * Requires on Vercel:
 *   AUTO_PUBLISH_ENABLED=true
 *   GITHUB_PUBLISH_TOKEN=<PAT with repo + workflow scope>
 *   GITHUB_REPOSITORY=yoqubkhoja1988/my-yoqubkhoja-tj
 *
 * Requires in GitHub repo secrets:
 *   POSTGRES_URL (same Neon URL as production)
 */

import { isDatabaseEnabled } from '@/lib/db';

const DEFAULT_REPO = 'yoqubkhoja1988/my-yoqubkhoja-tj';

export function isAutoPublishEnabled(): boolean {
  return (
    process.env.AUTO_PUBLISH_ENABLED === 'true' &&
    Boolean(process.env.GITHUB_PUBLISH_TOKEN?.trim()) &&
    isDatabaseEnabled()
  );
}

export function scheduleContentAutoPublish(reason: string): void {
  if (!isAutoPublishEnabled()) return;

  void triggerContentAutoPublish(reason).catch((error) => {
    console.error('Auto-publish dispatch failed:', error);
  });
}

async function triggerContentAutoPublish(reason: string): Promise<void> {
  const token = process.env.GITHUB_PUBLISH_TOKEN?.trim();
  if (!token) return;

  const repository = process.env.GITHUB_REPOSITORY?.trim() || DEFAULT_REPO;
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    console.error('Auto-publish: invalid GITHUB_REPOSITORY', repository);
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'app-data-updated',
      client_payload: {
        reason,
        at: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub dispatch ${response.status}: ${body}`);
  }
}
