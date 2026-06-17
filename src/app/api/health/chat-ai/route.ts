import { isChatAiConfigured } from '@/lib/chat-ai';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    enabled: isChatAiConfigured(),
    model: process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini',
  });
}
