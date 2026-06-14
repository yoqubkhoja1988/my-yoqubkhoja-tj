import { ChatConversation } from '@/types/chat';

export const CHAT_TYPING_TTL_MS = 5000;

export type ChatTypingStatus = {
  user: boolean;
  admin: boolean;
};

export function isTypingActive(at?: string | null): boolean {
  if (!at) return false;
  const time = new Date(at).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time < CHAT_TYPING_TTL_MS;
}

export function getTypingStatus(conversation: ChatConversation): ChatTypingStatus {
  return {
    user: isTypingActive(conversation.userTypingAt),
    admin: isTypingActive(conversation.adminTypingAt),
  };
}
