import { auth } from '@/auth';
import { attachFreshUserPermissions } from '@/lib/auth-session';
import { isSiteAdmin } from '@/lib/is-admin';
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

  const fresh = await attachFreshUserPermissions(session);
  return NextResponse.json(
    {
      permissions: fresh?.user?.permissions ?? null,
      userId: fresh?.user?.id ?? null,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
