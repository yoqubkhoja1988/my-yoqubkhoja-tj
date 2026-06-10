import { auth } from '@/auth';
import { buildAdminDataSnapshot } from '@/lib/admin-data';
import { isSiteAdmin } from '@/lib/is-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSiteAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(buildAdminDataSnapshot());
}
