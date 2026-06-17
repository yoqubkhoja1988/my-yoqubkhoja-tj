import { getLastChatAiError, isChatAiConfigured, probeChatAi } from '@/lib/chat-ai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isChatAiConfigured();
  const probe = configured ? await probeChatAi() : { ok: false, error: 'missing_api_key' as const };

  return NextResponse.json({
    configured,
    ready: probe.ok,
    model: process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini',
    lastError: probe.error ?? getLastChatAiError(),
  });
}
