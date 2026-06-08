import { auth } from '@/auth';
import LoginForm from '@/components/LoginForm';
import { redirect } from '@/i18n/navigation';

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();

  if (session) {
    redirect({ href: '/dashboard', locale });
  }

  return <LoginForm />;
}
