'use client';

import { FormEvent } from 'react';

export type GuestProfile = {
  name: string;
  email: string;
  phone: string;
};

type Props = {
  initialProfile?: GuestProfile;
  loading?: boolean;
  error?: string;
  onSubmit: (profile: GuestProfile) => void;
  labels: {
    title: string;
    subtitle: string;
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    submit: string;
    nameRequired: string;
  };
};

export default function ChatGuestIntroForm({
  initialProfile,
  loading = false,
  error,
  onSubmit,
  labels,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();

    if (!name) return;

    onSubmit({ name, email, phone });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-center gap-3 p-4">
      <div className="text-center">
        <p className="text-sm font-bold">{labels.title}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{labels.subtitle}</p>
      </div>

      <label className="space-y-1">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{labels.name}</span>
        <input
          name="name"
          required
          defaultValue={initialProfile?.name ?? ''}
          placeholder={labels.namePlaceholder}
          disabled={loading}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{labels.email}</span>
        <input
          name="email"
          type="email"
          defaultValue={initialProfile?.email ?? ''}
          placeholder={labels.emailPlaceholder}
          disabled={loading}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{labels.phone}</span>
        <input
          name="phone"
          type="tel"
          defaultValue={initialProfile?.phone ?? ''}
          placeholder={labels.phonePlaceholder}
          disabled={loading}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary mt-1 w-full px-3 py-2 text-sm">
        {loading ? '…' : labels.submit}
      </button>
    </form>
  );
}
