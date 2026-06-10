import { auth } from '@/auth';
import { isSiteAdmin } from '@/lib/is-admin';
import { NextResponse } from 'next/server';
import { Session } from 'next-auth';

export async function requireSession(): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

export async function requireAdmin(): Promise<Session | NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!isSiteAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}
