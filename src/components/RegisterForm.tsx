'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import AdminTelegramContact from './AdminTelegramContact';

export default function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setError(t('registerPasswordMismatch'));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(
          data.error === 'USERNAME_EXISTS'
            ? t('registerUsernameExists')
            : data.error === 'RESERVED_USERNAME'
              ? t('registerReservedUsername')
              : data.error === 'INVALID_USERNAME'
                ? t('registerInvalidUsername')
                : data.error === 'INVALID_PASSWORD'
                  ? t('registerInvalidPassword')
                  : t('registerError')
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 1800);
    } catch {
      setError(t('registerError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gov-content-panel">
      <p className="page-eyebrow text-center">{t('publicCabinetTitle')}</p>
      <h2 className="mb-1 text-center text-lg font-bold tracking-tight">{t('registerTitle')}</h2>
      <p className="mb-2 text-center text-xs text-[var(--text-muted)]">{t('registerSubtitle')}</p>
      <p className="mb-4 text-center text-xs text-[var(--text-muted)]">
        <AdminTelegramContact />
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-[var(--danger)]/40 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-500/40 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p>{t('registerSuccess')}</p>
          <p className="mt-2 text-xs text-green-700">
            <AdminTelegramContact linkClassName="font-semibold text-[var(--accent)] hover:underline" />
          </p>
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
            minLength={3}
            pattern="[a-zA-Z0-9._@-]+"
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
            minLength={6}
            autoComplete="new-password"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="field-label">
            {t('registerConfirmPassword')}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="input-field"
          />
        </div>
        <button type="submit" disabled={loading || success} className="btn-primary w-full py-3">
          {loading ? '...' : t('registerSubmit')}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        {t('registerHasAccount')}{' '}
        <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
          {t('login')}
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
