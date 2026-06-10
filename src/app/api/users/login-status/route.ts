import { getAdminUsername } from '@/lib/is-admin';
import { hashPassword, verifyPassword } from '@/lib/password-hash';
import { findUserByUsername } from '@/lib/users-store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim() ?? '';
    const password = body.password ?? '';

    if (!username || !password) {
      return NextResponse.json({ status: 'invalid' });
    }

    const expectedUser = getAdminUsername();
    const expectedHash =
      process.env.AUTH_PASSWORD_HASH ||
      'fc30043c381b6e6c79faae8309f4484ab9317a58ae4afaa328b5e926f350878f';

    if (username === expectedUser && hashPassword(password) === expectedHash) {
      return NextResponse.json({ status: 'ok' });
    }

    const user = findUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ status: 'invalid' });
    }

    if (user.status === 'pending') {
      return NextResponse.json({ status: 'pending' });
    }

    if (user.status === 'denied') {
      return NextResponse.json({ status: 'denied' });
    }

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'invalid' });
  }
}
