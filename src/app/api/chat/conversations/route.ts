import { auth } from '@/auth';
import {
  createConversation,
  findActiveConversationForUser,
  getMessagesAfter,
  addMessage,
  updateConversationSourcePage,
} from '@/lib/chat-store';
import { getWelcomeMessage } from '@/lib/chat-bot';
import { getChatAccessContext } from '@/lib/chat-service';
import {
  getClientIp,
  normalizeOptionalContact,
  normalizeSourcePage,
} from '@/lib/chat-visitor';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = (await request.json()) as {
      guestToken?: string;
      displayName?: string;
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
      sourcePage?: string;
    };

    const access = getChatAccessContext(session, body.guestToken);
    const guestName = body.guestName?.trim() || body.displayName?.trim();
    const displayName =
      guestName ||
      session?.user?.name?.trim() ||
      access.guestToken?.slice(0, 8) ||
      'Меҳмон';

    const guestEmail = normalizeOptionalContact(body.guestEmail);
    const guestPhone = normalizeOptionalContact(body.guestPhone);
    const sourcePage = normalizeSourcePage(body.sourcePage);
    const visitorIp = getClientIp(request);

    let conversation = await findActiveConversationForUser({
      userId: access.userId,
      guestToken: access.guestToken,
    });

    if (!conversation) {
      if (!access.userId && !guestName) {
        return NextResponse.json({ error: 'GUEST_NAME_REQUIRED' }, { status: 400 });
      }

      const created = await createConversation({
        userId: access.userId,
        guestToken: access.guestToken,
        displayName,
        guestEmail: access.userId ? null : guestEmail,
        guestPhone: access.userId ? null : guestPhone,
        sourcePage,
        visitorIp,
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

    if (sourcePage) {
      const refreshed = await updateConversationSourcePage(conversation.id, sourcePage);
      if (refreshed) conversation = refreshed;
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
