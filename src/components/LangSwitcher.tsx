'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

const locales = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
  { code: 'tj', label: 'TJ' },
  { code: 'uz', label: 'UZ' },
] as const;

export default function LangSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-1">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => router.replace(pathname, { locale: code })}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            locale === code
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
