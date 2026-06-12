import { auth } from '@/auth';
import { escalateConversation, getChatAccessContext, verifyConversationAccess } from '@/lib/chat-service';
import { findConversationById } from '@/lib/chat-store';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const { id } = await context.params;

  let body: { guestToken?: string; accessToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
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
    const result = await escalateConversation(id);
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
