import { auth } from '@/auth';
import {
  createConversation,
  findActiveConversationForUser,
  getMessagesAfter,
  addMessage,
} from '@/lib/chat-store';
import { getWelcomeMessage } from '@/lib/chat-bot';
import { getChatAccessContext } from '@/lib/chat-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = (await request.json()) as {
      guestToken?: string;
      displayName?: string;
    };

    const access = getChatAccessContext(session, body.guestToken);
    const displayName =
      body.displayName?.trim() ||
      session?.user?.name?.trim() ||
      access.guestToken?.slice(0, 8) ||
      'Меҳмон';

    let conversation = await findActiveConversationForUser({
      userId: access.userId,
      guestToken: access.guestToken,
    });

    if (!conversation) {
      const created = await createConversation({
        userId: access.userId,
        guestToken: access.guestToken,
        displayName,
      });

      await addMessage({
        conversationId: created.id,
        sender: 'bot',
        body: getWelcomeMessage(),
      });

      return NextResponse.json({
        conversationId: created.id,
        accessToken: created.accessToken,
        guestToken: created.guestToken,
        status: created.status,
        messages: await getMessagesAfter(created.id),
      });
    }

    const messages = await getMessagesAfter(conversation.id);
    return NextResponse.json({
      conversationId: conversation.id,
      accessToken: conversation.accessToken,
      guestToken: conversation.guestToken,
      status: conversation.status,
      messages,
    });
  } catch (error) {
    console.error('[chat/conversations POST]', error);
    return NextResponse.json({ error: 'Chat init failed' }, { status: 500 });
  }
}
