import { requireAdmin } from '@/lib/api-guard';
import { closeConversation, editAdminMessage, sendAdminMessage } from '@/lib/chat-service';
import { getTypingStatus } from '@/lib/chat-typing';
import {
  findConversationById,
  getMessagesAfter,
  listAdminConversations,
  setTypingIndicator,
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
      conversation,
      messages,
      typing: getTypingStatus(conversation),
    });
  }

  const conversations = await listAdminConversations();
  return NextResponse.json({
    conversations: conversations.map(({ messages, ...conversation }) => ({
      ...conversation,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1] ?? null,
      messages,
      typing: getTypingStatus(conversation),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as {
    conversationId?: string;
    message?: string;
    messageId?: string;
    action?: 'reply' | 'close' | 'typing' | 'edit';
    typing?: boolean;
  };

  const conversationId = body.conversationId?.trim();
  if (!conversationId) {
    return NextResponse.json({ error: 'MISSING_CONVERSATION' }, { status: 400 });
  }

  if (body.action === 'edit') {
    const messageId = body.messageId?.trim();
    const message = body.message?.trim() ?? '';
    if (!messageId || !message) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
    }

    try {
      const messages = await editAdminMessage({
        conversationId,
        messageId,
        body: message,
      });
      return NextResponse.json({ ok: true, messages });
    } catch (error) {
      if (error instanceof Error && error.message === 'EDIT_WINDOW_EXPIRED') {
        return NextResponse.json({ error: 'EDIT_WINDOW_EXPIRED' }, { status: 409 });
      }
      if (error instanceof Error && error.message === 'CONVERSATION_CLOSED') {
        return NextResponse.json({ error: 'CLOSED' }, { status: 409 });
      }
      return NextResponse.json({ error: 'FAILED' }, { status: 500 });
    }
  }

  if (body.action === 'typing') {
    const updated = await setTypingIndicator(conversationId, 'admin', body.typing === true);
    if (!updated) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      typing: getTypingStatus(updated),
    });
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
