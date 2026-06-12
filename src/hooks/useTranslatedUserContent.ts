'use client';

import {
  isNonTranslatableUserContent,
  shouldTranslateUserContent,
} from '@/lib/user-content-translate';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

const clientCache = new Map<string, string>();

function cacheKey(locale: string, text: string): string {
  return `${locale}::${text}`;
}

export function useTranslatedUserContent(text: string): string {
  const locale = useLocale();
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!text.trim() || !shouldTranslateUserContent(locale) || isNonTranslatableUserContent(text)) {
      setDisplay(text);
      return;
    }

    const key = cacheKey(locale, text);
    const cached = clientCache.get(key);
    if (cached) {
      setDisplay(cached);
      return;
    }

    let cancelled = false;
    fetch(`/api/translate?text=${encodeURIComponent(text)}&to=${encodeURIComponent(locale)}`, {
      credentials: 'same-origin',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('translate failed'))))
      .then((body: { text?: string }) => {
        if (cancelled) return;
        const translated = body.text?.trim() || text;
        clientCache.set(key, translated);
        setDisplay(translated);
      })
      .catch(() => {
        if (!cancelled) setDisplay(text);
      });

    return () => {
      cancelled = true;
    };
  }, [text, locale]);

  return display;
}
