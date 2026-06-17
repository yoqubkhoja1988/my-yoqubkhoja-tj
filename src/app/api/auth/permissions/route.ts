import { auth } from '@/auth';
import { attachFreshUserPermissions } from '@/lib/auth-session';
import { isSiteAdmin } from '@/lib/is-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isSiteAdmin(session)) {
    return NextResponse.json({ permissions: null, admin: true });
  }

  const fresh = await attachFreshUserPermissions(session);
  return NextResponse.json({
    permissions: fresh?.user?.permissions ?? null,
    userId: fresh?.user?.id ?? null,
  });
}
