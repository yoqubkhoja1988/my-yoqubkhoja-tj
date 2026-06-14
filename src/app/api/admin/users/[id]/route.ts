import { requireAdmin } from '@/lib/api-guard';
import { hashPassword } from '@/lib/password-hash';
import { deleteUser, updateUser } from '@/lib/users-store';
import { UserPermissions, UserStatus } from '@/types/user';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      status?: UserStatus;
      permissions?: UserPermissions;
      password?: string;
    };

    const password = body.password?.trim();
    if (password !== undefined && password.length > 0 && password.length < 6) {
      return NextResponse.json({ error: 'PASSWORD_TOO_SHORT' }, { status: 400 });
    }

    const updated = await updateUser(id, {
      ...(body.status ? { status: body.status } : {}),
      ...(body.permissions ? { permissions: body.permissions } : {}),
      ...(password ? { passwordHash: hashPassword(password) } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const removed = await deleteUser(id);
  if (!removed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
