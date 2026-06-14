import { requireAdmin } from '@/lib/api-guard';
import { closeConversation, sendAdminMessage } from '@/lib/chat-service';
import {
  findConversationById,
  getMessagesAfter,
  listAdminConversations,
} from '@/lib/chat-store';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const conversationId = request.nextUrl.searchParams.get('conversationId')?.trim();
  if (conversationId) {
    const conversation = await findConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const after = request.nextUrl.searchParams.get('after') ?? undefined;
    const messages = await getMessagesAfter(conversationId, after);

    return NextResponse.json({
      conversationId,
      status: conversation.status,
      messages,
    });
  }

  const conversations = await listAdminConversations();
  return NextResponse.json({
    conversations: conversations.map(({ messages, ...conversation }) => ({
      ...conversation,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1] ?? null,
      messages,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as {
    conversationId?: string;
    message?: string;
    action?: 'reply' | 'close';
  };

  const conversationId = body.conversationId?.trim();
  if (!conversationId) {
    return NextResponse.json({ error: 'MISSING_CONVERSATION' }, { status: 400 });
  }

  if (body.action === 'close') {
    const closed = await closeConversation(conversationId);
    if (!closed) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: closed.status });
  }

  const message = body.message?.trim() ?? '';
  if (!message) {
    return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 });
  }

  try {
    const messages = await sendAdminMessage({ conversationId, body: message });
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    if (error instanceof Error && error.message === 'CONVERSATION_NOT_FOUND') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
