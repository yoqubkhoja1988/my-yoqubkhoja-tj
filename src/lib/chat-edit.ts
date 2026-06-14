import { ChatMessage, ChatMessageSender } from '@/types/chat';

export const CHAT_MESSAGE_EDIT_WINDOW_MS = 60_000;

export function canEditChatMessage(message: ChatMessage, now = Date.now()): boolean {
  if (message.sender !== 'user' && message.sender !== 'admin') {
    return false;
  }

  const createdAt = new Date(message.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;

  return now - createdAt <= CHAT_MESSAGE_EDIT_WINDOW_MS;
}

export function getChatMessageEditSecondsLeft(message: ChatMessage, now = Date.now()): number {
  const createdAt = new Date(message.createdAt).getTime();
  if (Number.isNaN(createdAt)) return 0;

  const remainingMs = CHAT_MESSAGE_EDIT_WINDOW_MS - (now - createdAt);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function canEditMessageAsSender(message: ChatMessage, sender: ChatMessageSender): boolean {
  return message.sender === sender && canEditChatMessage(message);
}

export function mergeChatMessages(previous: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
