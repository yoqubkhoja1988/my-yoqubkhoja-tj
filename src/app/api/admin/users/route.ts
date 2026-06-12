import { requireAdmin } from '@/lib/api-guard';
import { getAdminUsername } from '@/lib/is-admin';
import { hashPassword } from '@/lib/password-hash';
import { getAdminUsersOverview } from '@/lib/user-presence';
import { createUser, findUserByUsername, listPublicUsers } from '@/lib/users-store';
import { UserPermissions, UserStatus } from '@/types/user';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;
  const users = await listPublicUsers();
  return NextResponse.json(await getAdminUsersOverview(users));
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      status?: UserStatus;
      permissions?: UserPermissions;
    };

    const username = body.username?.trim() ?? '';
    const password = body.password ?? '';

    if (username.length < 3 || !/^[a-zA-Z0-9._@-]+$/.test(username)) {
      return NextResponse.json({ error: 'INVALID_USERNAME' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 400 });
    }

    if (username.toLowerCase() === getAdminUsername().toLowerCase()) {
      return NextResponse.json({ error: 'RESERVED_USERNAME' }, { status: 400 });
    }

    if (await findUserByUsername(username)) {
      return NextResponse.json({ error: 'USERNAME_EXISTS' }, { status: 409 });
    }

    const user = await createUser({
      username,
      passwordHash: hashPassword(password),
      status: body.status ?? 'approved',
      permissions: body.permissions,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_EXISTS') {
      return NextResponse.json({ error: 'USERNAME_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }
}
