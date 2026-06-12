export function isLiveChatEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_LIVE_CHAT_ENABLED?.trim().toLowerCase();
  if (!raw) return true;
  return raw !== 'false' && raw !== '0' && raw !== 'off';
}
