import {
  getAdminUsername,
  isAuthSecretConfigured,
} from '@/lib/admin-credentials';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    authSecret: isAuthSecretConfigured(),
    authUrl: process.env.AUTH_URL?.trim() || null,
    adminUsername: getAdminUsername(),
    passwordHashConfigured: Boolean(process.env.AUTH_PASSWORD_HASH?.trim()),
  });
}
