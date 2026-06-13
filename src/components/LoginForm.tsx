'use client';

import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { FormEvent, useState } from 'react';
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
      router.push('/room');
      router.refresh();
    } else {
      setError(t('invalidCredentials'));
    }
  }

  return (
    <div className="gov-content-panel">
      <p className="page-eyebrow text-center">{t('publicCabinetTitle')}</p>
      <h2 className="mb-1 text-center text-lg font-bold tracking-tight">{t('login')}</h2>
      <p className="mb-4 text-center text-xs text-[var(--text-muted)]">{t('publicCabinetLoginHint')}</p>

      {error && (
        <div className="mb-4 rounded-xl border border-[var(--danger)]/40 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          {showAdminContact && (
            <p className="mt-2 text-xs text-red-700">
              <AdminTelegramContact linkClassName="font-semibold text-[var(--accent)] hover:underline" />
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
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? '...' : t('submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        {t('registerNoAccount')}{' '}
        <Link href="/register" className="font-semibold text-[var(--accent)] hover:underline">
          {t('registerTitle')}
        </Link>
      </p>
      <p className="mt-3 text-center">
        <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">
          ← {t('publicBackToSite')}
        </Link>
      </p>
    </div>
  );
}
