'use client';

import { ChatConversation } from '@/types/chat';
import { getChatVisitorKind } from '@/lib/chat-visitor';
import { useTranslations } from 'next-intl';

type Props = {
  conversation: Pick<ChatConversation, 'userId'>;
  compact?: boolean;
};

export default function ChatVisitorBadge({ conversation, compact = false }: Props) {
  const t = useTranslations();
  const kind = getChatVisitorKind(conversation as ChatConversation);
  const isRegistered = kind === 'registered';

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
      } ${
        isRegistered
          ? 'bg-emerald-500/20 text-emerald-300'
          : 'bg-slate-500/20 text-slate-300'
      }`}
    >
      {isRegistered ? t('adminChatVisitorRegistered') : t('adminChatVisitorGuest')}
    </span>
  );
}
