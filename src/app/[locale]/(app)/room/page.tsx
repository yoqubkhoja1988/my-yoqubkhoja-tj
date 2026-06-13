import { auth } from '@/auth';
import UserRoomHome from '@/components/UserRoomHome';
import { isSiteAdmin } from '@/lib/is-admin';
import { canAccessOrganizations, canAccessProjects } from '@/lib/user-access';

export default async function UserRoomPage() {
  const session = await auth();

  return (
    <UserRoomHome
      isAdmin={isSiteAdmin(session)}
      canAccessProjects={canAccessProjects(session)}
      canAccessOrganizations={canAccessOrganizations(session)}
    />
  );
}
