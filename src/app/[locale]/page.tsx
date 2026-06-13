import { auth } from '@/auth';
import { redirect } from '@/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();

  if (session) {
    redirect({ href: '/room', locale });
  } else {
    redirect({ href: '/login', locale });
  }
}
