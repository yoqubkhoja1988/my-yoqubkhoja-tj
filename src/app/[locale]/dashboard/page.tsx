import { auth } from '@/auth';
import DashboardContent from '@/components/DashboardContent';
import { redirect } from '@/i18n/navigation';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session) {
    redirect({ href: '/login', locale });
  }

  return <DashboardContent />;
}
