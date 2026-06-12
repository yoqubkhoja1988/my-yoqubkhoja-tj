import {
  handleTelegramAdminReply,
} from '@/lib/chat-service';
import { getTelegramUsername } from '@/lib/contact';
import {
  isTelegramConfiguredAsync,
  registerAdminChatFromWebhook,
  resolveTelegramRuntimeConfig,
  sendTelegramMessageWithConfig,
} from '@/lib/telegram-setup';
import {
  parseConversationIdFromText,
} from '@/lib/telegram-bot';
import { NextRequest, NextResponse } from 'next/server';

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number | string };
    from?: { username?: string; id?: number | string };
    reply_to_message?: { text?: string };
  };
};

function verifyWebhookSecret(request: NextRequest, expectedSecret: string): boolean {
  if (!expectedSecret) return true;
  return request.headers.get('x-telegram-bot-api-secret-token') === expectedSecret;
}

function extractReplyText(text: string): { conversationId: string; body: string } | null {
  const commandMatch = text.match(/^\/reply\s+([a-f0-9-]{36})\s+([\s\S]+)$/i);
  if (commandMatch) {
    return { conversationId: commandMatch[1], body: commandMatch[2].trim() };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const config = await resolveTelegramRuntimeConfig();

  if (!config.botToken) {
    return NextResponse.json({ ok: true });
  }

  if (!verifyWebhookSecret(request, config.webhookSecret)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;

  if (!message || !text || chatId === undefined) {
    return NextResponse.json({ ok: true });
  }

  const fromUsername = message.from?.username;
  const adminUsername = getTelegramUsername().toLowerCase();

  if (text.startsWith('/start')) {
    await registerAdminChatFromWebhook({
      chatId: String(chatId),
      username: fromUsername,
    });

    await sendTelegramMessageWithConfig(
      String(chatId),
      fromUsername?.toLowerCase() === adminUsername
        ? '✅ Салом! Шумо ҳамчун маъмури чат сабт шудед.\n\nБарои ҷавоб додан ба чати сомона, ба паёми огоҳӣ reply кунед ё:\n/reply CONVERSATION_ID матни ҷавоб'
        : `Салом! Ин бот барои чати зиндаи my-yoqubkhoja-tj аст.\n\nТанҳо маъмури @${adminUsername} метавонад аз ин ҷо ҷавоб диҳад.`,
      config.botToken
    );
    return NextResponse.json({ ok: true });
  }

  if (!(await isTelegramConfiguredAsync())) {
    return NextResponse.json({ ok: true });
  }

  const adminChatId = config.adminChatId;
  if (String(chatId) !== String(adminChatId)) {
    return NextResponse.json({ ok: true });
  }

  let conversationId: string | null = null;
  let replyBody = '';

  const commandReply = extractReplyText(text);
  if (commandReply) {
    conversationId = commandReply.conversationId;
    replyBody = commandReply.body;
  } else if (message?.reply_to_message?.text) {
    conversationId = parseConversationIdFromText(message.reply_to_message.text);
    replyBody = text;
  }

  if (!conversationId || !replyBody) {
    return NextResponse.json({ ok: true });
  }

  const handled = await handleTelegramAdminReply({
    conversationId,
    body: replyBody,
  });

  if (handled) {
    await sendTelegramMessageWithConfig(
      String(chatId),
      '✅ Ҷавоб ба чат фиристода шуд.',
      config.botToken
    );
  } else {
    await sendTelegramMessageWithConfig(
      String(chatId),
      '❌ Чат ёфт нашуд ё пӯшида шудааст.',
      config.botToken
    );
  }

  return NextResponse.json({ ok: true });
}
