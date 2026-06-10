const DEFAULT_TELEGRAM_USERNAME = 'yoqubkhoja1988';

export function getTelegramUsername(): string {
  const raw = process.env.NEXT_PUBLIC_CONTACT_TELEGRAM?.trim();
  const username = (raw || DEFAULT_TELEGRAM_USERNAME).replace(/^@/, '');
  return username;
}

export function getTelegramUrl(): string {
  return `https://t.me/${getTelegramUsername()}`;
}
