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
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-10 shadow-2xl">
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
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-500/20"
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
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-3 font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {loading ? '...' : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
