export type ChatUserLanguage = 'tj' | 'ru' | 'en' | 'uz';

const LANGUAGE_LABELS: Record<ChatUserLanguage, string> = {
  tj: 'Tajik',
  ru: 'Russian',
  en: 'English',
  uz: 'Uzbek',
};

export function normalizeAppLocale(locale?: string | null): ChatUserLanguage {
  const value = locale?.trim().toLowerCase();
  if (value === 'ru' || value === 'en' || value === 'uz' || value === 'tj') {
    return value;
  }
  return 'tj';
}

export function detectChatUserLanguage(
  message: string,
  appLocale?: string | null
): ChatUserLanguage {
  const text = message.trim().toLowerCase();
  if (!text) return normalizeAppLocale(appLocale);

  const letters = text.replace(/[^a-zа-яёўқғҳӣҷҳa-z]/gi, '');
  const latinCount = (letters.match(/[a-z]/gi) || []).length;
  const latinRatio = letters.length > 0 ? latinCount / letters.length : 0;

  if (/\b(привет|здравствуйте|как|войти|вход|регистра|помощь|пароль|логин|спасибо|помогите)\b/i.test(text)) {
    return 'ru';
  }
  if (/[ёъыэ]/i.test(text)) {
    return 'ru';
  }

  if (/\b(qanday|nima|salom|rahmat|kerak|yordam|kirish|parol|login)\b/i.test(text)) {
    return 'uz';
  }

  if (
    latinRatio > 0.55 ||
    /\b(hello|hi|hey|how|what|login|password|register|help|thanks|please)\b/i.test(text)
  ) {
    return latinRatio > 0.55 && /\b(qanday|nima|salom|rahmat|kerak)\b/i.test(text) ? 'uz' : 'en';
  }

  return normalizeAppLocale(appLocale);
}

export function getChatLanguageLabel(language: ChatUserLanguage): string {
  return LANGUAGE_LABELS[language];
}

export function shouldUseTajikKnowledgeBase(language: ChatUserLanguage): boolean {
  return language === 'tj';
}
