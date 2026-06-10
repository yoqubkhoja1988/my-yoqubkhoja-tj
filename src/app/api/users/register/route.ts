import { hashPassword, verifyPassword } from '@/lib/password-hash';
import { createUser, findUserByUsername } from '@/lib/users-store';
import { getAdminUsername } from '@/lib/is-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
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
      status: 'pending',
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_EXISTS') {
      return NextResponse.json({ error: 'USERNAME_EXISTS' }, { status: 409 });
    }
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
  }
}
