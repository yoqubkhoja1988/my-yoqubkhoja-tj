/** Маълумоти дастӣ одатан ба тоҷикӣ нигоҳ дошта мешавад */
export const USER_CONTENT_SOURCE_LOCALE = 'tj';

const LOCALE_TO_LANG: Record<string, string> = {
  tj: 'tg',
  ru: 'ru',
  en: 'en',
  uz: 'uz',
};

const serverCache = new Map<string, string>();
const MAX_CACHE = 2000;

function cacheKey(text: string, targetLocale: string): string {
  return `${targetLocale}::${text}`;
}

export function shouldTranslateUserContent(targetLocale: string): boolean {
  return targetLocale !== USER_CONTENT_SOURCE_LOCALE;
}

/** Ададҳо, рамзҳо ва кодҳо тарҷума намешаванд */
export function isNonTranslatableUserContent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (/^[\d\s.,\-–—+/%()]+$/.test(trimmed)) return true;
  if (/^\+?\d[\d\s\-()]+$/.test(trimmed)) return true;
  return false;
}

export function targetLangCode(targetLocale: string): string {
  return LOCALE_TO_LANG[targetLocale] ?? targetLocale;
}

export async function translateUserContent(
  text: string,
  targetLocale: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || !shouldTranslateUserContent(targetLocale)) {
    return text;
  }

  const key = cacheKey(trimmed, targetLocale);
  const cached = serverCache.get(key);
  if (cached) return cached;

  const source = LOCALE_TO_LANG[USER_CONTENT_SOURCE_LOCALE];
  const target = targetLangCode(targetLocale);
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('langpair', `${source}|${target}`);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return text;

    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText?.trim();
    if (!translated || translated.toUpperCase() === trimmed.toUpperCase()) {
      return text;
    }

    if (serverCache.size >= MAX_CACHE) {
      const first = serverCache.keys().next().value;
      if (first) serverCache.delete(first);
    }
    serverCache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

export async function translateUserContentBatch(
  texts: string[],
  targetLocale: string
): Promise<string[]> {
  if (!shouldTranslateUserContent(targetLocale)) {
    return texts;
  }

  return Promise.all(texts.map((text) => translateUserContent(text, targetLocale)));
}
