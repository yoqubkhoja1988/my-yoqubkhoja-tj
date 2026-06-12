import { randomUUID } from 'crypto';
import { getTelegramUsername } from '@/lib/contact';
import {
  getTelegramSettings,
  saveTelegramAdminChatId,
  saveTelegramSettings,
} from '@/lib/telegram-settings-store';

const TELEGRAM_API = 'https://api.telegram.org';

export type TelegramSetupStatus = {
  configured: boolean;
  botTokenSet: boolean;
  adminChatIdSet: boolean;
  webhookSecretSet: boolean;
  botUsername?: string;
  webhookUrl?: string;
  webhookActive?: boolean;
};

export async function getTelegramSetupStatus(): Promise<TelegramSetupStatus> {
  const settings = await getTelegramSettings();
  const botTokenSet = Boolean(settings.botToken);
  const adminChatIdSet = Boolean(settings.adminChatId);
  const webhookSecretSet = Boolean(settings.webhookSecret);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://my-yoqubkhoja-tj.vercel.app';
  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  let botUsername: string | undefined;
  let webhookActive: boolean | undefined;

  if (settings.botToken) {
    try {
      const me = await fetch(`${TELEGRAM_API}/bot${settings.botToken}/getMe`);
      if (me.ok) {
        const data = (await me.json()) as { result?: { username?: string } };
        botUsername = data.result?.username;
      }

      const info = await fetch(`${TELEGRAM_API}/bot${settings.botToken}/getWebhookInfo`);
      if (info.ok) {
        const data = (await info.json()) as { result?: { url?: string } };
        webhookActive = data.result?.url === webhookUrl;
      }
    } catch {
      // ignore
    }
  }

  return {
    configured: botTokenSet && adminChatIdSet,
    botTokenSet,
    adminChatIdSet,
    webhookSecretSet,
    botUsername,
    webhookUrl,
    webhookActive,
  };
}

export async function resolveTelegramRuntimeConfig() {
  const settings = await getTelegramSettings();
  return {
    botToken: settings.botToken ?? '',
    adminChatId: settings.adminChatId ?? '',
    webhookSecret: settings.webhookSecret ?? '',
  };
}

export async function isTelegramConfiguredAsync(): Promise<boolean> {
  const config = await resolveTelegramRuntimeConfig();
  return Boolean(config.botToken && config.adminChatId);
}

export async function activateTelegramIntegration(input?: {
  botToken?: string;
  adminChatId?: string;
}): Promise<TelegramSetupStatus> {
  const current = await getTelegramSettings();
  const botToken = input?.botToken?.trim() || current.botToken;
  if (!botToken) {
    throw new Error('BOT_TOKEN_REQUIRED');
  }

  const meResponse = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);
  if (!meResponse.ok) {
    throw new Error('INVALID_BOT_TOKEN');
  }

  const webhookSecret = current.webhookSecret || randomUUID().replace(/-/g, '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://my-yoqubkhoja-tj.vercel.app';
  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  const setWebhookResponse = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ['message'],
    }),
  });

  if (!setWebhookResponse.ok) {
    throw new Error('WEBHOOK_SETUP_FAILED');
  }

  let adminChatId = input?.adminChatId?.trim() || current.adminChatId;

  if (!adminChatId) {
    adminChatId = await discoverAdminChatId(botToken) ?? undefined;
  }

  await saveTelegramSettings({
    botToken,
    adminChatId,
    webhookSecret,
  });

  return getTelegramSetupStatus();
}

async function discoverAdminChatId(botToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/getUpdates?limit=20`);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      result?: Array<{
        message?: {
          chat?: { id?: number | string; username?: string };
          from?: { username?: string };
          text?: string;
        };
      }>;
    };

    const adminUsername = getTelegramUsername().toLowerCase();
    for (const update of data.result ?? []) {
      const chat = update.message?.chat;
      const fromUsername = update.message?.from?.username?.toLowerCase();
      if (
        chat?.id !== undefined &&
        (fromUsername === adminUsername || chat.username?.toLowerCase() === adminUsername)
      ) {
        return String(chat.id);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function registerAdminChatFromWebhook(input: {
  chatId: string;
  username?: string;
}): Promise<boolean> {
  const adminUsername = getTelegramUsername().toLowerCase();
  if (input.username?.toLowerCase() !== adminUsername) {
    return false;
  }

  await saveTelegramAdminChatId(input.chatId);
  return true;
}

export async function sendTelegramMessageWithConfig(
  chatId: string,
  text: string,
  botToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendTelegramTestMessage(): Promise<boolean> {
  const config = await resolveTelegramRuntimeConfig();
  if (!config.botToken || !config.adminChatId) return false;

  return sendTelegramMessageWithConfig(
    config.adminChatId,
    '✅ Telegram барои чати зиндаи my-yoqubkhoja-tj танзим шуд.',
    config.botToken
  );
}
