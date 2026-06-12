import { requireSession } from '@/lib/api-guard';
import { isSiteAdmin } from '@/lib/is-admin';
import { getPresenceKeyFromSession, touchPresence } from '@/lib/user-presence';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const presenceKey = getPresenceKeyFromSession(session);
  if (!presenceKey) {
    return NextResponse.json({ error: 'INVALID_SESSION' }, { status: 400 });
  }

  let path: string | undefined;
  try {
    const body = (await request.json()) as { path?: string };
    path = typeof body.path === 'string' ? body.path.slice(0, 500) : undefined;
  } catch {
    path = undefined;
  }

  const username = session.user?.name?.trim() || presenceKey;
  const role = isSiteAdmin(session) ? 'admin' : 'user';

  await touchPresence({
    presenceKey,
    username,
    displayName: username,
    role,
    path,
  });

  return NextResponse.json({ ok: true });
}
