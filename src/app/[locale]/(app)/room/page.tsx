import { getAuthSession } from '@/lib/auth-session';
import UserRoomHome from '@/components/UserRoomHome';
import { isSiteAdmin } from '@/lib/is-admin';
import { canAccessOrganizations, canAccessProjects } from '@/lib/user-access';

export const dynamic = 'force-dynamic';

export default async function UserRoomPage() {
  const session = await getAuthSession();

  return (
    <UserRoomHome
      isAdmin={isSiteAdmin(session)}
      canAccessProjects={canAccessProjects(session)}
      canAccessOrganizations={canAccessOrganizations(session)}
    />
  );
}
