import { ChatConversation } from '@/types/chat';
import { NextRequest } from 'next/server';

export type ChatVisitorKind = 'guest' | 'registered';

export function getChatVisitorKind(conversation: ChatConversation): ChatVisitorKind {
  return conversation.userId ? 'registered' : 'guest';
}

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return null;
}

export function formatVisitorMetaLines(conversation: ChatConversation): string[] {
  const lines: string[] = [];
  const kind = getChatVisitorKind(conversation);

  lines.push(kind === 'registered' ? '✅ Корбари воридшуда' : '👤 Меҳмон (бе вуруд)');

  if (conversation.guestEmail) {
    lines.push(`📧 Email: ${conversation.guestEmail}`);
  }
  if (conversation.guestPhone) {
    lines.push(`📞 Телефон: ${conversation.guestPhone}`);
  }
  if (conversation.sourcePage) {
    lines.push(`🌐 Саҳифа: ${conversation.sourcePage}`);
  }
  if (conversation.visitorIp) {
    lines.push(`🔗 IP: ${conversation.visitorIp}`);
  }
  if (conversation.userId) {
    lines.push(`🆔 ID: ${conversation.userId}`);
  }

  return lines;
}

export function normalizeOptionalContact(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeSourcePage(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) return trimmed.slice(0, 500);
  return trimmed;
}
