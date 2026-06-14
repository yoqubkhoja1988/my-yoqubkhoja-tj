import { ChatConversation, ChatMessage } from '@/types/chat';
import { formatVisitorMetaLines } from '@/lib/chat-visitor';
import {
  isTelegramConfiguredAsync,
  resolveTelegramRuntimeConfig,
  sendTelegramMessageWithConfig,
} from '@/lib/telegram-setup';

export function getConversationMarker(conversationId: string): string {
  return `#conv_${conversationId}`;
}

export function parseConversationIdFromText(text: string): string | null {
  const match = text.match(/#conv_([a-f0-9-]{36})/i);
  return match?.[1] ?? null;
}

export async function isTelegramConfigured(): Promise<boolean> {
  return isTelegramConfiguredAsync();
}

export async function getAdminChatId(): Promise<string> {
  const config = await resolveTelegramRuntimeConfig();
  if (!config.adminChatId) throw new Error('TELEGRAM_ADMIN_CHAT_ID missing');
  return config.adminChatId;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const config = await resolveTelegramRuntimeConfig();
  if (!config.botToken) return false;
  return sendTelegramMessageWithConfig(chatId, text, config.botToken);
}

function formatRecentMessages(messages: ChatMessage[]): string {
  return messages
    .slice(-5)
    .map((message) => {
      const label =
        message.sender === 'user'
          ? '👤'
          : message.sender === 'bot'
            ? '🤖'
            : message.sender === 'admin'
              ? '🛡'
              : 'ℹ️';
      return `${label} ${message.body}`;
    })
    .join('\n');
}

export async function notifyAdminEscalation(
  conversation: ChatConversation,
  messages: ChatMessage[]
): Promise<boolean> {
  if (!(await isTelegramConfigured())) return false;

  const marker = getConversationMarker(conversation.id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://my-yoqubkhoja-tj.vercel.app';
  const text = [
    '🔔 ДАРХОСТИ НАВ АЗ ЧАТ',
    marker,
    `👤 Корбар: ${conversation.displayName}`,
    ...formatVisitorMetaLines(conversation),
    `📋 Ҳолат: ${conversation.status === 'human' ? 'Маъмур лозим' : conversation.status}`,
    '',
    '💬 Пайғомҳои охирин:',
    formatRecentMessages(messages),
    '',
    `🌐 Сайт: ${siteUrl}`,
    '',
    'Барои ҷавоб додан, ба ин паём reply кунед ё:',
    `/reply ${conversation.id} матни ҷавоб`,
  ].join('\n');

  return sendTelegramMessage(await getAdminChatId(), text);
}

export async function notifyAdminNewUserMessage(
  conversation: ChatConversation,
  message: ChatMessage
): Promise<boolean> {
  if (!(await isTelegramConfigured()) || conversation.status !== 'human') return false;

  const marker = getConversationMarker(conversation.id);
  const text = [
    '💬 ПАЙҒОМИ НАВ ДАР ЧАТ',
    marker,
    `👤 ${conversation.displayName}`,
    ...formatVisitorMetaLines(conversation),
    '',
    message.body,
    '',
    'Барои ҷавоб: reply ё /reply ' + conversation.id + ' матн',
  ].join('\n');

  return sendTelegramMessage(await getAdminChatId(), text);
}
