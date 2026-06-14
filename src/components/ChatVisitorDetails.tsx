'use client';

import { ChatConversation } from '@/types/chat';
import { useTranslations } from 'next-intl';
import ChatVisitorBadge from '@/components/ChatVisitorBadge';

type Props = {
  conversation: Pick<
    ChatConversation,
    'displayName' | 'userId' | 'guestEmail' | 'guestPhone' | 'sourcePage' | 'visitorIp'
  >;
};

export default function ChatVisitorDetails({ conversation }: Props) {
  const t = useTranslations();

  const rows = [
    conversation.guestEmail
      ? { label: t('adminChatVisitorEmail'), value: conversation.guestEmail }
      : null,
    conversation.guestPhone
      ? { label: t('adminChatVisitorPhone'), value: conversation.guestPhone }
      : null,
    conversation.sourcePage
      ? { label: t('adminChatVisitorPage'), value: conversation.sourcePage }
      : null,
    conversation.visitorIp
      ? { label: t('adminChatVisitorIp'), value: conversation.visitorIp }
      : null,
    conversation.userId
      ? { label: t('adminChatVisitorUserId'), value: conversation.userId }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="border-b border-[var(--border)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold">{conversation.displayName}</p>
        <ChatVisitorBadge conversation={conversation} />
      </div>

      {rows.length > 0 ? (
        <dl className="mt-2 space-y-1 text-xs">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1 sm:grid-cols-[minmax(0,7rem)_1fr]">
              <dt className="font-semibold text-[var(--text-muted)]">{row.label}</dt>
              <dd className="break-all text-[var(--text)]">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-muted)]">{t('adminChatVisitorNoMeta')}</p>
      )}
    </div>
  );
}
