'use client';

import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { FormEvent, useState } from 'react';
import LangSwitcher from './LangSwitcher';
import Logo from './Logo';

export default function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      username: form.get('username'),
      password: form.get('password'),
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
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="hero-gradient rounded-2xl border border-[var(--border)] p-8 shadow-2xl md:p-10">
          <div className="mb-8 flex flex-col items-center">
            <Logo centered />
          </div>

          <div className="mb-6 flex justify-center">
            <LangSwitcher />
          </div>

          <h2 className="mb-6 text-center text-2xl font-bold">{t('login')}</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--danger)] bg-red-500/15 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">
                {t('username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-semibold text-[var(--text-muted)]">
                {t('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? '...' : t('submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
