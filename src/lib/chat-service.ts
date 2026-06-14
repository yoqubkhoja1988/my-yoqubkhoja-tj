import { Session } from 'next-auth';
import {
  addMessage,
  canAccessConversation,
  editMessage,
  findConversationById,
  getConversationWithMessages,
  getMessagesAfter,
  markTelegramNotified,
  updateConversationStatus,
} from '@/lib/chat-store';
import {
  getAdminJoinedMessage,
  getBotReply,
  getEscalationConfirmationMessage,
} from '@/lib/chat-bot';
import { isSiteAdmin } from '@/lib/is-admin';
import {
  notifyAdminEscalation,
  notifyAdminNewUserMessage,
} from '@/lib/telegram-bot';
import { ChatConversation, ChatMessage } from '@/types/chat';

export type ChatAccessContext = {
  userId: string | null;
  guestToken: string | null;
  isAdmin: boolean;
  displayName: string;
};

export function getChatAccessContext(
  session: Session | null,
  guestTokenInput?: string | null
): ChatAccessContext {
  const isAdmin = isSiteAdmin(session);
  const userId = session?.user?.id && !isAdmin ? session.user.id : null;
  const guestToken = userId ? null : guestTokenInput?.trim() || null;

  return {
    userId,
    guestToken,
    isAdmin,
    displayName: session?.user?.name?.trim() || 'Меҳмон',
  };
}

export function verifyConversationAccess(
  conversation: ChatConversation,
  access: ChatAccessContext,
  accessToken?: string | null
): boolean {
  return canAccessConversation(conversation, {
    userId: access.userId,
    guestToken: access.guestToken,
    accessToken,
    isAdmin: access.isAdmin,
  });
}

export async function escalateConversation(conversationId: string): Promise<{
  conversation: ChatConversation;
  messages: ChatMessage[];
}> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND');
  }

  if (conversation.status === 'closed') {
    throw new Error('CONVERSATION_CLOSED');
  }

  if (conversation.status !== 'human') {
    await updateConversationStatus(conversationId, 'human');
    await addMessage({
      conversationId,
      sender: 'system',
      body: getEscalationConfirmationMessage(),
    });
  }

  const updated = (await findConversationById(conversationId))!;
  const messages = await getMessagesAfter(conversationId);

  if (!updated.telegramNotifiedAt) {
    const sent = await notifyAdminEscalation(updated, messages);
    if (sent) {
      await markTelegramNotified(conversationId);
    }
  }

  return {
    conversation: (await findConversationById(conversationId))!,
    messages: await getMessagesAfter(conversationId),
  };
}

export async function processBotTurn(
  conversationId: string,
  userMessage: string
): Promise<ChatMessage[]> {
  const conversation = await findConversationById(conversationId);
  if (!conversation || conversation.status !== 'bot') {
    return getMessagesAfter(conversationId);
  }

  const history = await getMessagesAfter(conversationId);
  const reply = getBotReply(userMessage, history);

  await addMessage({
    conversationId,
    sender: 'bot',
    body: reply.body,
  });

  if (reply.escalate) {
    await escalateConversation(conversationId);
  }

  return getMessagesAfter(conversationId);
}

export async function sendUserMessage(input: {
  conversationId: string;
  body: string;
}): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  const conversation = await findConversationById(input.conversationId);
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND');
  }

  if (conversation.status === 'closed') {
    throw new Error('CONVERSATION_CLOSED');
  }

  const userMessage = await addMessage({
    conversationId: input.conversationId,
    sender: 'user',
    body: input.body,
  });

  if (conversation.status === 'bot') {
    await processBotTurn(input.conversationId, input.body);
  } else if (conversation.status === 'human') {
    await notifyAdminNewUserMessage(conversation, userMessage);
  }

  return {
    conversation: (await findConversationById(input.conversationId))!,
    messages: await getMessagesAfter(input.conversationId),
  };
}

export async function sendAdminMessage(input: {
  conversationId: string;
  body: string;
}): Promise<ChatMessage[]> {
  const conversation = await findConversationById(input.conversationId);
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND');
  }

  if (conversation.status === 'closed') {
    throw new Error('CONVERSATION_CLOSED');
  }

  if (conversation.status === 'bot') {
    await updateConversationStatus(input.conversationId, 'human');
    await addMessage({
      conversationId: input.conversationId,
      sender: 'system',
      body: getAdminJoinedMessage(),
    });
  }

  await addMessage({
    conversationId: input.conversationId,
    sender: 'admin',
    body: input.body,
  });

  return getMessagesAfter(input.conversationId);
}

export async function editUserMessage(input: {
  conversationId: string;
  messageId: string;
  body: string;
}): Promise<ChatMessage[]> {
  await editMessage({
    conversationId: input.conversationId,
    messageId: input.messageId,
    body: input.body,
    allowedSender: 'user',
  });
  return getMessagesAfter(input.conversationId);
}

export async function editAdminMessage(input: {
  conversationId: string;
  messageId: string;
  body: string;
}): Promise<ChatMessage[]> {
  await editMessage({
    conversationId: input.conversationId,
    messageId: input.messageId,
    body: input.body,
    allowedSender: 'admin',
  });
  return getMessagesAfter(input.conversationId);
}

export async function closeConversation(conversationId: string): Promise<ChatConversation | null> {
  await addMessage({
    conversationId,
    sender: 'system',
    body: 'Чат пӯшида шуд. Ташаккур барои муроҷиат!',
  });
  return updateConversationStatus(conversationId, 'closed');
}

export async function handleTelegramAdminReply(input: {
  conversationId: string;
  body: string;
}): Promise<boolean> {
  const conversation = await findConversationById(input.conversationId);
  if (!conversation || conversation.status === 'closed') return false;

  await sendAdminMessage({
    conversationId: input.conversationId,
    body: input.body,
  });
  return true;
}

export async function getConversationSnapshot(conversationId: string) {
  return getConversationWithMessages(conversationId);
}
