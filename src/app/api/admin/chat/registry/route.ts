import { requireAdmin } from '@/lib/api-guard';
import { getTypingStatus } from '@/lib/chat-typing';
import {
  findConversationById,
  getMessagesAfter,
  listChatRegistry,
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

    const messages = await getMessagesAfter(conversationId);
    return NextResponse.json({
      conversationId,
      status: conversation.status,
      conversation,
      messages,
      typing: getTypingStatus(conversation),
    });
  }

  const requests = await listChatRegistry();
  return NextResponse.json({
    requests: requests.map(({ lastMessage, messageCount, ...conversation }) => ({
      ...conversation,
      messageCount,
      lastMessage,
    })),
  });
}
