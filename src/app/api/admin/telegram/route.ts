import { requireAdmin } from '@/lib/api-guard';
import {
  activateTelegramIntegration,
  getTelegramSetupStatus,
  sendTelegramTestMessage,
} from '@/lib/telegram-setup';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  return NextResponse.json(await getTelegramSetupStatus());
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as {
    action?: 'activate' | 'test';
    botToken?: string;
    adminChatId?: string;
  };

  try {
    if (body.action === 'test') {
      const ok = await sendTelegramTestMessage();
      return NextResponse.json({ ok, status: await getTelegramSetupStatus() });
    }

    const status = await activateTelegramIntegration({
      botToken: body.botToken,
      adminChatId: body.adminChatId,
    });

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'FAILED';
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
