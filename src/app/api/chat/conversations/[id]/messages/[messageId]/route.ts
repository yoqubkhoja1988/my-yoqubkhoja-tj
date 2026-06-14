import { auth } from '@/auth';
import {
  editUserMessage,
  getChatAccessContext,
  verifyConversationAccess,
} from '@/lib/chat-service';
import { findConversationById } from '@/lib/chat-store';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string; messageId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const { id, messageId } = await context.params;

  let body: { message?: string; guestToken?: string; accessToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const text = body.message?.trim() ?? '';
  if (!text) {
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
    const messages = await editUserMessage({
      conversationId: id,
      messageId,
      body: text,
    });
    return NextResponse.json({
      conversationId: id,
      status: conversation.status,
      messages,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'EDIT_WINDOW_EXPIRED') {
        return NextResponse.json({ error: 'EDIT_WINDOW_EXPIRED' }, { status: 409 });
      }
      if (error.message === 'CONVERSATION_CLOSED') {
        return NextResponse.json({ error: 'CLOSED' }, { status: 409 });
      }
      if (error.message === 'MESSAGE_NOT_FOUND' || error.message === 'FORBIDDEN_SENDER') {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
