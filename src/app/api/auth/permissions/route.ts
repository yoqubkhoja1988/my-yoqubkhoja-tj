import { auth } from '@/auth';
import { isSiteAdmin } from '@/lib/is-admin';
import { findUserById } from '@/lib/users-store';
import { normalizeUserPermissions } from '@/types/user';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isSiteAdmin(session)) {
    return NextResponse.json(
      { permissions: null, admin: true },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json(
      { permissions: null, userId: null, updatedAt: null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  const storedUser = await findUserById(userId);
  if (!storedUser || storedUser.status !== 'approved') {
    return NextResponse.json(
      { permissions: null, userId, updatedAt: storedUser?.updatedAt ?? null },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  return NextResponse.json(
    {
      permissions: normalizeUserPermissions(storedUser.permissions),
      userId,
      updatedAt: storedUser.updatedAt ?? storedUser.createdAt,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
