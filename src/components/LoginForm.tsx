'use client';

import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { FormEvent, useState } from 'react';
import LangSwitcher from './LangSwitcher';
import Logo from './Logo';
import AppFooter from './AppFooter';
import AdminTelegramContact from './AdminTelegramContact';

export default function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState('');
  const [showAdminContact, setShowAdminContact] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setShowAdminContact(false);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');

    const statusResponse = await fetch('/api/users/login-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const statusData = (await statusResponse.json()) as { status?: string };

    if (statusData.status === 'pending') {
      setError(t('loginPendingApproval'));
      setShowAdminContact(true);
      setLoading(false);
      return;
    }

    if (statusData.status === 'denied') {
      setError(t('loginAccessDenied'));
      setShowAdminContact(true);
      setLoading(false);
      return;
    }

    if (statusData.status === 'config') {
      setError(t('loginConfigError'));
      setLoading(false);
      return;
    }

    if (statusData.status === 'invalid') {
      setError(t('invalidCredentials'));
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(t('invalidCredentials'));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative flex flex-1 items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-in">
        <div className="hero-gradient rounded-xl p-5 shadow-2xl md:p-6">
          <div className="mb-5 flex flex-col items-center">
            <Logo centered />
          </div>

          <div className="mb-4 flex justify-center">
            <LangSwitcher />
          </div>

          <h2 className="mb-4 text-center text-lg font-bold tracking-tight">{t('login')}</h2>

          {error && (
            <div className="mb-4 rounded-xl border border-[var(--danger)]/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <p>{error}</p>
              {showAdminContact && (
                <p className="mt-2 text-xs text-red-200/90">
                  <AdminTelegramContact linkClassName="font-semibold text-sky-300 hover:underline" />
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="username" className="field-label">
                {t('username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input-field"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
              {loading ? '...' : t('submit')}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
            {t('registerNoAccount')}{' '}
            <Link href="/register" className="font-semibold text-[var(--accent)] hover:underline">
              {t('registerTitle')}
            </Link>
          </p>
        </div>
      </div>
      </div>
      <AppFooter />
    </div>
  );
}
