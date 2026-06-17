import { auth } from '@/auth';
import { isSiteAdmin } from '@/lib/is-admin';
import { findUserById } from '@/lib/users-store';
import { normalizeUserPermissions } from '@/types/user';
import { Session } from 'next-auth';

export async function attachFreshUserPermissions(
  session: Session | null
): Promise<Session | null> {
  if (!session?.user?.id || isSiteAdmin(session)) {
    return session;
  }

  const storedUser = await findUserById(session.user.id);
  if (!storedUser || storedUser.status !== 'approved') {
    session.user.permissions = undefined;
    return session;
  }

  session.user.permissions = normalizeUserPermissions(storedUser.permissions);
  session.user.role = 'user';
  return session;
}

/** Session with permissions always loaded from the database (not stale JWT cache). */
export async function getAuthSession(): Promise<Session | null> {
  const session = await auth();
  if (!session) return null;
  return attachFreshUserPermissions(session);
}
