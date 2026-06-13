import { auth } from '@/auth';
import UserRoomShell from '@/components/UserRoomShell';
import { redirect } from '@/i18n/navigation';

export default async function AuthenticatedAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session) {
    redirect({ href: '/login', locale });
  }

  return <UserRoomShell>{children}</UserRoomShell>;
}
