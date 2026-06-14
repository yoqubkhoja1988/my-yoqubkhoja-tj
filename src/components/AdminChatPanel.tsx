'use client';

import { ChatConversationStatus, ChatMessage } from '@/types/chat';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import ChatTypingIndicator from '@/components/ChatTypingIndicator';
import { ChatTypingStatus, useChatTyping } from '@/hooks/useChatTyping';

type AdminChatListItem = {
  id: string;
  displayName: string;
  status: ChatConversationStatus;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: ChatMessage | null;
  messages: ChatMessage[];
  typing?: ChatTypingStatus;
};

const STATUS_CLASS: Record<ChatConversationStatus, string> = {
  bot: 'bg-indigo-500/20 text-indigo-300',
  human: 'bg-amber-500/20 text-amber-300',
  closed: 'bg-[var(--bg-input)] text-[var(--text-muted)]',
};

type TelegramSetupStatus = {
  configured: boolean;
  botTokenSet: boolean;
  adminChatIdSet: boolean;
  webhookSecretSet: boolean;
  botUsername?: string;
  webhookUrl?: string;
  webhookActive?: boolean;
};

export default function AdminChatPanel() {
  const t = useTranslations();
  const [conversations, setConversations] = useState<AdminChatListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [peerTyping, setPeerTyping] = useState<ChatTypingStatus>({ user: false, admin: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<TelegramSetupStatus | null>(null);
  const [botToken, setBotToken] = useState('');
  const [adminChatId, setAdminChatId] = useState('');
  const [telegramBusy, setTelegramBusy] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const pollTickRef = useRef(0);
  messagesRef.current = messages;
  selectedIdRef.current = selectedId;

  const sendTyping = useCallback(
    async (typing: boolean) => {
      const conversationId = selectedIdRef.current;
      if (!conversationId) return;
      try {
        await fetch('/api/admin/chat', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            action: 'typing',
            typing,
          }),
        });
      } catch {
        // ignore typing heartbeat failures
      }
    },
    []
  );

  useChatTyping({
    enabled: Boolean(selectedId),
    conversationId: selectedId,
    draft: reply,
    sendTyping,
  });

  const syncSelectedMessages = useCallback((items: AdminChatListItem[], conversationId: string | null) => {
    if (!conversationId) return;
    const selected = items.find((item) => item.id === conversationId);
    if (selected?.messages) {
      setMessages(selected.messages);
    }
    if (selected?.typing) {
      setPeerTyping(selected.typing);
    }
  }, []);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/admin/chat', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('load');
      const data = (await response.json()) as { conversations: AdminChatListItem[] };
      setConversations(data.conversations);
      setError('');

      const activeSelectedId = selectedIdRef.current;
      if (activeSelectedId && !data.conversations.some((item) => item.id === activeSelectedId)) {
        setSelectedId(null);
        setMessages([]);
        selectedIdRef.current = null;
      } else {
        syncSelectedMessages(data.conversations, activeSelectedId);
      }

      if (!activeSelectedId) {
        const waitingHuman = data.conversations.find((item) => item.status === 'human');
        if (waitingHuman) {
          setSelectedId(waitingHuman.id);
          selectedIdRef.current = waitingHuman.id;
          setMessages(waitingHuman.messages);
          if (waitingHuman.typing) {
            setPeerTyping(waitingHuman.typing);
          }
        }
      }
    } catch {
      if (!silent) setError(t('adminChatLoadError'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [syncSelectedMessages, t]);

  const loadThread = useCallback(async (conversationId: string, after?: string) => {
    try {
      const query = new URLSearchParams({ conversationId });
      if (after) query.set('after', after);

      const response = await fetch(`/api/admin/chat?${query.toString()}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('thread');

      const data = (await response.json()) as {
        messages: ChatMessage[];
        typing?: ChatTypingStatus;
      };

      if (after) {
        setMessages((prev) => {
          const ids = new Set(prev.map((message) => message.id));
          const next = [...prev];
          for (const message of data.messages) {
            if (!ids.has(message.id)) next.push(message);
          }
          return next;
        });
      } else {
        setMessages(data.messages);
      }
      if (data.typing) {
        setPeerTyping(data.typing);
      }
      setError('');
    } catch {
      setError(t('adminChatLoadError'));
    }
  }, [t]);

  const loadTelegramStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/telegram', { credentials: 'same-origin' });
      if (response.ok) {
        setTelegramStatus((await response.json()) as TelegramSetupStatus);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadList();
    void loadTelegramStatus();
  }, [loadList, loadTelegramStatus]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      pollTickRef.current += 1;
      void loadList(true);

      const activeSelectedId = selectedIdRef.current;
      if (!activeSelectedId) return;

      if (pollTickRef.current % 3 === 0) {
        void loadThread(activeSelectedId);
        return;
      }

      const lastMessage = messagesRef.current[messagesRef.current.length - 1];
      void loadThread(activeSelectedId, lastMessage?.createdAt);
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [loadList, loadThread]);

  async function selectConversation(id: string, presetMessages?: ChatMessage[], presetTyping?: ChatTypingStatus) {
    setSelectedId(id);
    selectedIdRef.current = id;
    setReply('');
    setError('');
    if (presetMessages) {
      setMessages(presetMessages);
    }
    if (presetTyping) {
      setPeerTyping(presetTyping);
    } else {
      setPeerTyping({ user: false, admin: false });
    }
    await loadThread(id);
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim() || saving) return;

    setSaving(true);
    setError('');
    void sendTyping(false);

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedId,
          message: reply.trim(),
          action: 'reply',
        }),
      });

      if (!response.ok) throw new Error('reply');

      const data = (await response.json()) as { messages: ChatMessage[] };
      setMessages(data.messages);
      setReply('');
      await loadList(true);
    } catch {
      setError(t('adminChatReplyError'));
    } finally {
      setSaving(false);
    }
  }

  async function closeChat() {
    if (!selectedId || saving) return;
    if (!confirm(t('adminChatConfirmClose'))) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedId,
          action: 'close',
        }),
      });
      if (!response.ok) throw new Error('close');
      setSelectedId(null);
      setMessages([]);
      await loadList();
    } catch {
      setError(t('adminChatReplyError'));
    } finally {
      setSaving(false);
    }
  }

  async function activateTelegram() {
    setTelegramBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/telegram', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          botToken: botToken.trim() || undefined,
          adminChatId: adminChatId.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { status?: TelegramSetupStatus; error?: string };
      if (!response.ok) {
        setError(data.error === 'INVALID_BOT_TOKEN' ? t('adminTelegramInvalidToken') : t('adminTelegramSetupError'));
        return;
      }
      if (data.status) setTelegramStatus(data.status);
      setBotToken('');
    } catch {
      setError(t('adminTelegramSetupError'));
    } finally {
      setTelegramBusy(false);
    }
  }

  async function testTelegram() {
    setTelegramBusy(true);
    try {
      const response = await fetch('/api/admin/telegram', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      if (!response.ok) setError(t('adminTelegramTestError'));
    } catch {
      setError(t('adminTelegramTestError'));
    } finally {
      setTelegramBusy(false);
    }
  }

  function statusLabel(status: ChatConversationStatus) {
    return {
      bot: t('adminChatStatusBot'),
      human: t('adminChatStatusHuman'),
      closed: t('adminChatStatusClosed'),
    }[status];
  }

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">{t('adminChatLoading')}</div>;
  }

  const humanCount = conversations.filter((item) => item.status === 'human').length;

  return (
    <section className="space-y-4">
      <div className="glass-card p-4">
        <p className="page-eyebrow">{t('adminChatEyebrow')}</p>
        <h3 className="text-lg font-bold">{t('adminChatTitle')}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t('adminChatSubtitle')}</p>
      </div>

      <div className="glass-card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold">{t('adminTelegramTitle')}</h4>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{t('adminTelegramSubtitle')}</p>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              telegramStatus?.configured
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {telegramStatus?.configured ? t('adminTelegramReady') : t('adminTelegramNotReady')}
          </span>
        </div>

        <div className="grid gap-2 text-xs text-[var(--text-muted)] sm:grid-cols-2">
          <p>{t('adminTelegramWebhook')}: {telegramStatus?.webhookActive ? '✅' : '—'}</p>
          <p>{t('adminTelegramBot')}: {telegramStatus?.botUsername ? `@${telegramStatus.botUsername}` : '—'}</p>
        </div>

        {!telegramStatus?.configured && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder={t('adminTelegramTokenPlaceholder')}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            />
            <input
              value={adminChatId}
              onChange={(e) => setAdminChatId(e.target.value)}
              placeholder={t('adminTelegramChatIdPlaceholder')}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            />
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)]">{t('adminTelegramStartHint')}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={telegramBusy || (!telegramStatus?.botTokenSet && !botToken.trim())}
            onClick={() => void activateTelegram()}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            {telegramBusy ? '…' : t('adminTelegramActivate')}
          </button>
          {telegramStatus?.configured && (
            <button
              type="button"
              disabled={telegramBusy}
              onClick={() => void testTelegram()}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {t('adminTelegramTest')}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-xs uppercase text-[var(--text-muted)]">{t('adminChatStatOpen')}</p>
          <p className="mt-1 text-2xl font-bold">{conversations.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase text-[var(--text-muted)]">{t('adminChatStatHuman')}</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{humanCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase text-[var(--text-muted)]">{t('adminChatStatTelegram')}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('adminChatTelegramHint')}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)]/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-bold">
            {t('adminChatListTitle')}
          </div>
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-[var(--text-muted)]">{t('adminChatEmpty')}</p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-[var(--border)] overflow-y-auto">
              {conversations.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void selectConversation(item.id, item.messages, item.typing)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-white/5 ${
                      selectedId === item.id ? 'bg-[var(--accent)]/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{item.displayName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLASS[item.status]}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {item.lastMessage?.body ?? '—'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card flex min-h-[420px] flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--text-muted)]">
              {t('adminChatSelectHint')}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <p className="text-sm font-bold">
                  {conversations.find((item) => item.id === selectedId)?.displayName}
                </p>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void closeChat()}
                  className="rounded-lg border border-[var(--danger)] px-2 py-1 text-[10px] font-semibold text-[var(--danger)]"
                >
                  {t('adminChatClose')}
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      message.sender === 'admin'
                        ? 'ml-auto bg-emerald-500/20 text-emerald-100'
                        : message.sender === 'user'
                          ? 'bg-[var(--accent)]/20'
                          : message.sender === 'bot'
                            ? 'bg-indigo-500/20 text-indigo-100'
                            : 'bg-[var(--bg-input)] text-xs italic text-[var(--text-muted)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  </div>
                ))}
                {peerTyping.user && (
                  <ChatTypingIndicator label={t('adminChatTypingUser')} />
                )}
              </div>

              <form onSubmit={sendReply} className="border-t border-[var(--border)] p-3">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t('adminChatReplyPlaceholder')}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm"
                  />
                  <button type="submit" disabled={saving || !reply.trim()} className="btn-primary px-3 py-2 text-xs">
                    {saving ? '…' : t('adminChatReply')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
