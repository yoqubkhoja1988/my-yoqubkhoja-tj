const INTL_LOCALE_MAP: Record<string, string> = {
  tj: 'tg-TJ',
  ru: 'ru-RU',
  en: 'en-US',
  uz: 'uz-UZ',
};

/** Map app locale codes to valid BCP 47 tags for Intl APIs. */
export function toIntlLocale(locale: string): string {
  return INTL_LOCALE_MAP[locale] ?? locale;
}

/** HTML lang attribute (ISO 639-1). */
export function toHtmlLang(locale: string): string {
  if (locale === 'tj') return 'tg';
  return locale;
}

export function formatAppDate(
  value: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(toIntlLocale(locale), options);
}
