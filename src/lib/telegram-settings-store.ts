import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { ensureDatabaseReady, isDatabaseEnabled, sql } from '@/lib/db';

const FILE = join(process.cwd(), 'data', 'telegram-settings.json');

export type TelegramSettings = {
  botToken?: string;
  adminChatId?: string;
  webhookSecret?: string;
  updatedAt?: string;
};

function readFileSettings(): TelegramSettings {
  try {
    const data = readFileSync(FILE, 'utf-8');
    const parsed = JSON.parse(data) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as TelegramSettings;
  } catch {
    return {};
  }
}

function persistFileSettings(settings: TelegramSettings): void {
  const dir = dirname(FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const json = `${JSON.stringify(settings, null, 2)}\n`;
  const tempFile = `${FILE}.tmp`;
  writeFileSync(tempFile, json, 'utf-8');
  renameSync(tempFile, FILE);
}

async function readDbSettings(): Promise<TelegramSettings> {
  await ensureDatabaseReady();
  const { rows } = await sql<{ key: string; value: string }>`
    SELECT key, value FROM system_settings WHERE key LIKE 'telegram_%'
  `;

  const settings: TelegramSettings = {};
  for (const row of rows) {
    if (row.key === 'telegram_bot_token') settings.botToken = row.value;
    if (row.key === 'telegram_admin_chat_id') settings.adminChatId = row.value;
    if (row.key === 'telegram_webhook_secret') settings.webhookSecret = row.value;
    if (row.key === 'telegram_updated_at') settings.updatedAt = row.value;
  }
  return settings;
}

async function writeDbSetting(key: string, value: string): Promise<void> {
  await ensureDatabaseReady();
  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const fromEnv: TelegramSettings = {
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || undefined,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || undefined,
  };

  const stored = isDatabaseEnabled() ? await readDbSettings() : readFileSettings();

  return {
    botToken: fromEnv.botToken || stored.botToken,
    adminChatId: fromEnv.adminChatId || stored.adminChatId,
    webhookSecret: fromEnv.webhookSecret || stored.webhookSecret,
    updatedAt: stored.updatedAt,
  };
}

export async function saveTelegramSettings(patch: TelegramSettings): Promise<TelegramSettings> {
  const current = isDatabaseEnabled() ? await readDbSettings() : readFileSettings();
  const next: TelegramSettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (isDatabaseEnabled()) {
    if (patch.botToken !== undefined) {
      await writeDbSetting('telegram_bot_token', patch.botToken);
    }
    if (patch.adminChatId !== undefined) {
      await writeDbSetting('telegram_admin_chat_id', patch.adminChatId);
    }
    if (patch.webhookSecret !== undefined) {
      await writeDbSetting('telegram_webhook_secret', patch.webhookSecret);
    }
    await writeDbSetting('telegram_updated_at', next.updatedAt ?? new Date().toISOString());
  } else {
    persistFileSettings(next);
  }

  return getTelegramSettings();
}

export async function saveTelegramAdminChatId(chatId: string): Promise<void> {
  if (process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()) return;
  await saveTelegramSettings({ adminChatId: chatId });
}
