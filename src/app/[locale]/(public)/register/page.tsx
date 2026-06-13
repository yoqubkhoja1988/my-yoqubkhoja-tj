import RegisterForm from '@/components/RegisterForm';
import { auth } from '@/auth';
import { redirect } from '@/i18n/navigation';

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();

  if (session) {
    redirect({ href: '/room', locale });
  }

  return (
    <div className="public-portal-main">
      <div className="mx-auto max-w-md animate-in py-8">
        <RegisterForm />
      </div>
    </div>
  );
}
