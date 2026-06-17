import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { ensureDatabaseReady, isDatabaseEnabled, sql } from '@/lib/db';
import {
  ChatConversation,
  ChatConversationStatus,
  ChatConversationWithMessages,
  ChatMessage,
  ChatMessageSender,
} from '@/types/chat';
import { canEditChatMessage } from '@/lib/chat-edit';

const CONVERSATIONS_FILE = join(process.cwd(), 'data', 'chat-conversations.json');
const MESSAGES_FILE = join(process.cwd(), 'data', 'chat-messages.json');

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    const data = readFileSync(file, 'utf-8');
    const parsed = JSON.parse(data) as unknown;
    return (Array.isArray(parsed) ? parsed : fallback) as T;
  } catch {
    return fallback;
  }
}

function persistJsonFile(file: string, data: unknown): void {
  const dir = dirname(file);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const json = `${JSON.stringify(data, null, 2)}\n`;
  const tempFile = `${file}.tmp`;
  writeFileSync(tempFile, json, 'utf-8');
  renameSync(tempFile, file);
}

function rowToConversation(row: {
  id: string;
  access_token: string;
  user_id: string | null;
  guest_token: string | null;
  display_name: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
  last_message_at: Date | string;
  telegram_notified_at: Date | string | null;
  user_typing_at?: Date | string | null;
  admin_typing_at?: Date | string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  source_page?: string | null;
  visitor_ip?: string | null;
}): ChatConversation {
  return {
    id: row.id,
    accessToken: row.access_token,
    userId: row.user_id,
    guestToken: row.guest_token,
    displayName: row.display_name,
    status: row.status as ChatConversationStatus,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    lastMessageAt: new Date(row.last_message_at).toISOString(),
    telegramNotifiedAt: row.telegram_notified_at
      ? new Date(row.telegram_notified_at).toISOString()
      : undefined,
    userTypingAt: row.user_typing_at ? new Date(row.user_typing_at).toISOString() : undefined,
    adminTypingAt: row.admin_typing_at ? new Date(row.admin_typing_at).toISOString() : undefined,
    guestEmail: row.guest_email ?? null,
    guestPhone: row.guest_phone ?? null,
    sourcePage: row.source_page ?? null,
    visitorIp: row.visitor_ip ?? null,
  };
}

function rowToMessage(row: {
  id: string;
  conversation_id: string;
  sender: string;
  body: string;
  created_at: Date | string;
  edited_at?: Date | string | null;
}): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sender: row.sender as ChatMessageSender,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
    editedAt: row.edited_at ? new Date(row.edited_at).toISOString() : undefined,
  };
}

async function readConversations(): Promise<ChatConversation[]> {
  if (!isDatabaseEnabled()) {
    return readJsonFile<ChatConversation[]>(CONVERSATIONS_FILE, []);
  }

  await ensureDatabaseReady();
  const { rows } = await sql<{
    id: string;
    access_token: string;
    user_id: string | null;
    guest_token: string | null;
    display_name: string;
    status: string;
    created_at: Date | string;
    updated_at: Date | string;
    last_message_at: Date | string;
    telegram_notified_at: Date | string | null;
    user_typing_at: Date | string | null;
    admin_typing_at: Date | string | null;
    guest_email: string | null;
    guest_phone: string | null;
    source_page: string | null;
    visitor_ip: string | null;
  }>`SELECT * FROM chat_conversations ORDER BY last_message_at DESC`;

  return rows.map(rowToConversation);
}

async function readMessages(conversationId?: string): Promise<ChatMessage[]> {
  if (!isDatabaseEnabled()) {
    const all = readJsonFile<ChatMessage[]>(MESSAGES_FILE, []);
    return conversationId ? all.filter((message) => message.conversationId === conversationId) : all;
  }

  await ensureDatabaseReady();
  if (conversationId) {
    const { rows } = await sql<{
      id: string;
      conversation_id: string;
      sender: string;
      body: string;
      created_at: Date | string;
      edited_at: Date | string | null;
    }>`SELECT * FROM chat_messages WHERE conversation_id = ${conversationId} ORDER BY created_at ASC`;
    return rows.map(rowToMessage);
  }

  const { rows } = await sql<{
    id: string;
    conversation_id: string;
    sender: string;
    body: string;
    created_at: Date | string;
    edited_at: Date | string | null;
  }>`SELECT * FROM chat_messages ORDER BY created_at ASC`;
  return rows.map(rowToMessage);
}

async function saveConversation(conversation: ChatConversation): Promise<void> {
  if (!isDatabaseEnabled()) {
    const conversations = readJsonFile<ChatConversation[]>(CONVERSATIONS_FILE, []);
    const index = conversations.findIndex((item) => item.id === conversation.id);
    if (index === -1) {
      conversations.push(conversation);
    } else {
      conversations[index] = conversation;
    }
    persistJsonFile(CONVERSATIONS_FILE, conversations);
    return;
  }

  await ensureDatabaseReady();
  await sql`
    INSERT INTO chat_conversations (
      id,
      access_token,
      user_id,
      guest_token,
      display_name,
      status,
      created_at,
      updated_at,
      last_message_at,
      telegram_notified_at,
      user_typing_at,
      admin_typing_at,
      guest_email,
      guest_phone,
      source_page,
      visitor_ip
    )
    VALUES (
      ${conversation.id},
      ${conversation.accessToken},
      ${conversation.userId},
      ${conversation.guestToken},
      ${conversation.displayName},
      ${conversation.status},
      ${conversation.createdAt},
      ${conversation.updatedAt},
      ${conversation.lastMessageAt},
      ${conversation.telegramNotifiedAt ?? null},
      ${conversation.userTypingAt ?? null},
      ${conversation.adminTypingAt ?? null},
      ${conversation.guestEmail ?? null},
      ${conversation.guestPhone ?? null},
      ${conversation.sourcePage ?? null},
      ${conversation.visitorIp ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      last_message_at = EXCLUDED.last_message_at,
      telegram_notified_at = EXCLUDED.telegram_notified_at,
      user_typing_at = EXCLUDED.user_typing_at,
      admin_typing_at = EXCLUDED.admin_typing_at,
      guest_email = EXCLUDED.guest_email,
      guest_phone = EXCLUDED.guest_phone,
      source_page = EXCLUDED.source_page,
      visitor_ip = EXCLUDED.visitor_ip
  `;
}

async function saveMessage(message: ChatMessage): Promise<void> {
  if (!isDatabaseEnabled()) {
    const messages = readJsonFile<ChatMessage[]>(MESSAGES_FILE, []);
    const index = messages.findIndex((item) => item.id === message.id);
    if (index === -1) {
      messages.push(message);
    } else {
      messages[index] = message;
    }
    persistJsonFile(MESSAGES_FILE, messages);
    return;
  }

  await ensureDatabaseReady();
  await sql`
    INSERT INTO chat_messages (id, conversation_id, sender, body, created_at, edited_at)
    VALUES (
      ${message.id},
      ${message.conversationId},
      ${message.sender},
      ${message.body},
      ${message.createdAt},
      ${message.editedAt ?? null}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

async function updateMessageBody(message: ChatMessage): Promise<void> {
  if (!isDatabaseEnabled()) {
    const messages = readJsonFile<ChatMessage[]>(MESSAGES_FILE, []);
    const index = messages.findIndex((item) => item.id === message.id);
    if (index === -1) {
      throw new Error('MESSAGE_NOT_FOUND');
    }
    messages[index] = message;
    persistJsonFile(MESSAGES_FILE, messages);
    return;
  }

  await ensureDatabaseReady();
  await sql`
    UPDATE chat_messages
    SET body = ${message.body}, edited_at = ${message.editedAt ?? null}
    WHERE id = ${message.id}
  `;
}

export async function findConversationById(id: string): Promise<ChatConversation | null> {
  const conversations = await readConversations();
  return conversations.find((conversation) => conversation.id === id) ?? null;
}

export async function getConversationWithMessages(
  id: string
): Promise<ChatConversationWithMessages | null> {
  const conversation = await findConversationById(id);
  if (!conversation) return null;
  const messages = await readMessages(id);
  return { ...conversation, messages };
}

export function canAccessConversation(
  conversation: ChatConversation,
  input: {
    userId?: string | null;
    guestToken?: string | null;
    accessToken?: string | null;
    isAdmin?: boolean;
  }
): boolean {
  if (input.isAdmin) return true;
  if (input.accessToken && input.accessToken === conversation.accessToken) return true;
  if (input.userId && conversation.userId === input.userId) return true;
  if (input.guestToken && conversation.guestToken === input.guestToken) return true;
  return false;
}

export async function findActiveConversationForUser(input: {
  userId?: string | null;
  guestToken?: string | null;
}): Promise<ChatConversation | null> {
  const conversations = await readConversations();
  return (
    conversations.find((conversation) => {
      if (conversation.status === 'closed') return false;
      if (input.userId && conversation.userId === input.userId) return true;
      if (input.guestToken && conversation.guestToken === input.guestToken) return true;
      return false;
    }) ?? null
  );
}

export async function createConversation(input: {
  userId?: string | null;
  guestToken?: string | null;
  displayName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  sourcePage?: string | null;
  visitorIp?: string | null;
}): Promise<ChatConversationWithMessages> {
  const now = new Date().toISOString();
  const conversation: ChatConversation = {
    id: randomUUID(),
    accessToken: randomUUID(),
    userId: input.userId ?? null,
    guestToken: input.guestToken ?? null,
    displayName: input.displayName,
    status: 'bot',
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    guestEmail: input.guestEmail ?? null,
    guestPhone: input.guestPhone ?? null,
    sourcePage: input.sourcePage ?? null,
    visitorIp: input.visitorIp ?? null,
  };

  await saveConversation(conversation);
  return { ...conversation, messages: [] };
}

export async function addMessage(input: {
  conversationId: string;
  sender: ChatMessageSender;
  body: string;
}): Promise<ChatMessage> {
  const conversation = await findConversationById(input.conversationId);
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND');
  }

  const now = new Date().toISOString();
  const message: ChatMessage = {
    id: randomUUID(),
    conversationId: input.conversationId,
    sender: input.sender,
    body: input.body.trim(),
    createdAt: now,
  };

  await saveMessage(message);

  conversation.updatedAt = now;
  conversation.lastMessageAt = now;
  if (input.sender === 'user') {
    conversation.userTypingAt = undefined;
  } else if (input.sender === 'admin') {
    conversation.adminTypingAt = undefined;
  }
  await saveConversation(conversation);

  return message;
}

export async function updateConversationStatus(
  conversationId: string,
  status: ChatConversationStatus
): Promise<ChatConversation | null> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return null;

  conversation.status = status;
  conversation.updatedAt = new Date().toISOString();
  await saveConversation(conversation);
  return conversation;
}

export async function updateConversationSourcePage(
  conversationId: string,
  sourcePage: string | null
): Promise<ChatConversation | null> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return null;

  const normalized = sourcePage?.trim() || null;
  if (conversation.sourcePage === normalized) {
    return conversation;
  }

  conversation.sourcePage = normalized;
  conversation.updatedAt = new Date().toISOString();
  await saveConversation(conversation);
  return conversation;
}

export async function markTelegramNotified(conversationId: string): Promise<void> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return;

  conversation.telegramNotifiedAt = new Date().toISOString();
  conversation.updatedAt = conversation.telegramNotifiedAt;
  await saveConversation(conversation);
}

export async function listAdminConversations(): Promise<ChatConversationWithMessages[]> {
  const conversations = await readConversations();
  const open = conversations.filter((conversation) => conversation.status !== 'closed');

  const result: ChatConversationWithMessages[] = [];
  for (const conversation of open) {
    const messages = await readMessages(conversation.id);
    result.push({ ...conversation, messages });
  }

  return result.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export type ChatRegistryItem = ChatConversation & {
  messageCount: number;
  lastMessage: ChatMessage | null;
};

export async function listChatRegistry(): Promise<ChatRegistryItem[]> {
  const conversations = await readConversations();
  const result: ChatRegistryItem[] = [];

  for (const conversation of conversations) {
    const messages = await readMessages(conversation.id);
    result.push({
      ...conversation,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1] ?? null,
    });
  }

  return result.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export async function getMessagesAfter(
  conversationId: string,
  after?: string
): Promise<ChatMessage[]> {
  const messages = await readMessages(conversationId);
  if (!after) return messages;

  const afterTime = new Date(after).getTime();
  if (Number.isNaN(afterTime)) return messages;

  return messages.filter((message) => {
    const createdAt = new Date(message.createdAt).getTime();
    if (createdAt >= afterTime) return true;
    if (!message.editedAt) return false;
    return new Date(message.editedAt).getTime() >= afterTime;
  });
}

export async function setTypingIndicator(
  conversationId: string,
  role: 'user' | 'admin',
  typing: boolean
): Promise<ChatConversation | null> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return null;

  const now = new Date().toISOString();
  if (role === 'user') {
    conversation.userTypingAt = typing ? now : undefined;
  } else {
    conversation.adminTypingAt = typing ? now : undefined;
  }
  conversation.updatedAt = now;
  await saveConversation(conversation);
  return conversation;
}

export async function editMessage(input: {
  conversationId: string;
  messageId: string;
  body: string;
  allowedSender: Extract<ChatMessageSender, 'user' | 'admin'>;
}): Promise<ChatMessage> {
  const conversation = await findConversationById(input.conversationId);
  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND');
  }
  if (conversation.status === 'closed') {
    throw new Error('CONVERSATION_CLOSED');
  }

  const messages = await readMessages(input.conversationId);
  const message = messages.find((item) => item.id === input.messageId);
  if (!message) {
    throw new Error('MESSAGE_NOT_FOUND');
  }
  if (message.sender !== input.allowedSender) {
    throw new Error('FORBIDDEN_SENDER');
  }
  if (!canEditChatMessage(message)) {
    throw new Error('EDIT_WINDOW_EXPIRED');
  }

  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error('EMPTY_MESSAGE');
  }

  const now = new Date().toISOString();
  const updated: ChatMessage = {
    ...message,
    body: trimmed,
    editedAt: now,
  };

  await updateMessageBody(updated);

  conversation.updatedAt = now;
  await saveConversation(conversation);

  return updated;
}
