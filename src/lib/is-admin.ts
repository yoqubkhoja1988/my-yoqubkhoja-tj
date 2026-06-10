import { getAdminUsername } from '@/lib/admin-credentials';
import { Session } from 'next-auth';

export function isSiteAdmin(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  if (session.user.role === 'admin') return true;
  return session.user.name?.toLowerCase() === getAdminUsername().toLowerCase();
}

export { getAdminUsername };
