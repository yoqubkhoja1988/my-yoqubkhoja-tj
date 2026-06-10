import { isAuthSecretConfigured, verifyAdminCredentials } from '@/lib/admin-credentials';
import { verifyPassword } from '@/lib/password-hash';
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

    if (!isAuthSecretConfigured()) {
      return NextResponse.json({ status: 'config' });
    }

    if (verifyAdminCredentials(username, password)) {
      return NextResponse.json({ status: 'ok' });
    }

    const user = await findUserByUsername(username);
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
