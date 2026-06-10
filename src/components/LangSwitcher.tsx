'use client';

import { toIntlLocale } from '@/lib/intl-locale';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

const locales = ['ru', 'en', 'tj', 'uz'] as const;

export default function LangSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const displayNames = new Intl.DisplayNames([toIntlLocale(locale)], { type: 'language' });

  return (
    <div
      className="flex gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] p-1"
      role="group"
      aria-label={t('language')}
    >
      {locales.map((code) => {
        const intlCode = code === 'tj' ? 'tg' : code;
        const label = displayNames.of(intlCode) ?? code.toUpperCase();

        return (
          <button
            key={code}
            type="button"
            onClick={() => router.replace(pathname, { locale: code })}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              locale === code
                ? 'bg-gradient-to-br from-[var(--accent)] to-indigo-500 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
