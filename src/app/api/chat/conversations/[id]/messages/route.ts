import { auth } from '@/auth';
import {
  escalateConversation,
  getChatAccessContext,
  processBotTurn,
  sendUserMessage,
  verifyConversationAccess,
} from '@/lib/chat-service';
import { findConversationById, getMessagesAfter } from '@/lib/chat-store';
import { normalizeSourcePage } from '@/lib/chat-visitor';
import { getTypingStatus } from '@/lib/chat-typing';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const { id } = await context.params;
  const guestToken = request.headers.get('x-chat-guest-token');
  const accessToken = request.headers.get('x-chat-access-token');
  const after = request.nextUrl.searchParams.get('after') ?? undefined;

  const conversation = await findConversationById(id);
  if (!conversation) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const access = getChatAccessContext(session, guestToken);
  if (!verifyConversationAccess(conversation, access, accessToken)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const messages = await getMessagesAfter(id, after);
  return NextResponse.json({
    conversationId: id,
    status: conversation.status,
    messages,
    typing: getTypingStatus(conversation),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const { id } = await context.params;

  let body: {
    message?: string;
    guestToken?: string;
    accessToken?: string;
    quickTopicId?: string;
    sourcePage?: string;
    locale?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const message = body.message?.trim() ?? '';
  if (!message) {
    return NextResponse.json({ error: 'EMPTY_MESSAGE' }, { status: 400 });
  }

  const conversation = await findConversationById(id);
  if (!conversation) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const access = getChatAccessContext(session, body.guestToken);
  if (!verifyConversationAccess(conversation, access, body.accessToken)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const result = await sendUserMessage({
      conversationId: id,
      body: message,
      quickTopicId: body.quickTopicId,
      sourcePage: normalizeSourcePage(body.sourcePage),
      locale: body.locale?.trim() || undefined,
    });
    return NextResponse.json({
      conversationId: id,
      status: result.conversation.status,
      messages: result.messages,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CONVERSATION_CLOSED') {
      return NextResponse.json({ error: 'CLOSED' }, { status: 409 });
    }
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
