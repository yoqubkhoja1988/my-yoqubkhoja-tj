import { auth } from '@/auth';
import {
  getChatAccessContext,
  verifyConversationAccess,
} from '@/lib/chat-service';
import { getTypingStatus } from '@/lib/chat-typing';
import { findConversationById, setTypingIndicator } from '@/lib/chat-store';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await auth();
  const { id } = await context.params;

  let body: { typing?: boolean; guestToken?: string; accessToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const conversation = await findConversationById(id);
  if (!conversation) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const access = getChatAccessContext(session, body.guestToken);
  if (!verifyConversationAccess(conversation, access, body.accessToken)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const updated = await setTypingIndicator(id, 'user', body.typing === true);
  if (!updated) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    conversationId: id,
    typing: getTypingStatus(updated),
  });
}
