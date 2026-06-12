'use client';

import { ChatMessage, ChatConversationStatus } from '@/types/chat';
import { useLiveChat } from '@/contexts/live-chat-context';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { QUICK_TOPICS } from '@/lib/chat-bot';

const STORAGE_GUEST = 'chat_guest_token';
const STORAGE_CONVERSATION = 'chat_conversation_id';
const STORAGE_ACCESS = 'chat_access_token';

const POLL_MS = 4000;
const CHAT_FETCH_TIMEOUT_MS = 20000;

function fetchWithTimeout(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(CHAT_FETCH_TIMEOUT_MS),
  });
}

function clearChatStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_CONVERSATION);
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_GUEST);
}

function getOrCreateGuestToken(): string {
  if (typeof window === 'undefined') return '';
  const existing = localStorage.getItem(STORAGE_GUEST);
  if (existing) return existing;
  const token = crypto.randomUUID();
  localStorage.setItem(STORAGE_GUEST, token);
  return token;
}

function senderLabel(sender: ChatMessage['sender'], t: (key: string) => string): string {
  switch (sender) {
    case 'user':
      return t('liveChatYou');
    case 'bot':
      return t('liveChatBot');
    case 'admin':
      return t('liveChatAdmin');
    default:
      return t('liveChatSystem');
  }
}

function messageClass(sender: ChatMessage['sender']): string {
  switch (sender) {
    case 'user':
      return 'ml-auto bg-[var(--accent)] text-white';
    case 'admin':
      return 'bg-emerald-500/20 text-emerald-100';
    case 'bot':
      return 'bg-indigo-500/20 text-indigo-100';
    default:
      return 'bg-[var(--bg-input)] text-[var(--text-muted)] text-center text-xs italic';
  }
}

export default function LiveChatWidget() {
  const t = useTranslations();
  const { data: session, status: sessionStatus } = useSession();
  const { enabled, open, openChat, closeChat } = useLiveChat();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatConversationStatus>('bot');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const messagesRef = useRef<ChatMessage[]>([]);
  const preparedForOpenRef = useRef(false);
  messagesRef.current = messages;

  const resetConversationState = useCallback(() => {
    setConversationId(null);
    setAccessToken(null);
    setGuestToken(null);
    setChatStatus('bot');
    setMessages([]);
    setError('');
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  const initConversation = useCallback(async () => {
    if (sessionStatus === 'loading') return;

    setError('');

    const guest = session?.user?.id ? null : getOrCreateGuestToken();
    setGuestToken(guest);

    const response = await fetchWithTimeout('/api/chat/conversations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestToken: guest,
        displayName: session?.user?.name,
      }),
    });

    if (!response.ok) throw new Error('init');

    const data = (await response.json()) as {
      conversationId: string;
      accessToken: string;
      guestToken: string | null;
      status: ChatConversationStatus;
      messages: ChatMessage[];
    };

    setConversationId(data.conversationId);
    setAccessToken(data.accessToken);
    if (data.guestToken) {
      localStorage.setItem(STORAGE_GUEST, data.guestToken);
      setGuestToken(data.guestToken);
    }
    localStorage.setItem(STORAGE_CONVERSATION, data.conversationId);
    localStorage.setItem(STORAGE_ACCESS, data.accessToken);
    setChatStatus(data.status);
    setMessages(data.messages);
  }, [session?.user?.id, session?.user?.name, sessionStatus]);

  const pollMessages = useCallback(async () => {
    if (!conversationId || !accessToken) return;

    const lastMessage = messages[messages.length - 1];
    const after = lastMessage?.createdAt;

    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`,
        {
          credentials: 'same-origin',
          headers: {
            'x-chat-access-token': accessToken,
            ...(guestToken ? { 'x-chat-guest-token': guestToken } : {}),
          },
        }
      );

      if (!response.ok) return;

      const data = (await response.json()) as {
        status: ChatConversationStatus;
        messages: ChatMessage[];
      };

      setChatStatus(data.status);
      if (data.messages.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((message) => message.id));
          const next = [...prev];
          for (const message of data.messages) {
            if (!ids.has(message.id)) next.push(message);
          }
          return next;
        });
      }
    } catch {
      // silent poll failure
    }
  }, [accessToken, conversationId, guestToken, messages]);

  useEffect(() => {
    if (!open || !conversationId) return;

    const intervalId = window.setInterval(() => {
      void pollMessages();
    }, POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [open, conversationId, pollMessages]);

  const prepareConversation = useCallback(async () => {
    if (sessionStatus === 'loading') return;

    const storedId = localStorage.getItem(STORAGE_CONVERSATION);
    const storedAccess = localStorage.getItem(STORAGE_ACCESS);
    const storedGuest = localStorage.getItem(STORAGE_GUEST);

    setLoading(true);
    setError('');

    try {
      if (
        conversationId &&
        accessToken &&
        chatStatus !== 'closed' &&
        storedId === conversationId &&
        storedAccess === accessToken
      ) {
        try {
          const lastMessage = messagesRef.current[messagesRef.current.length - 1];
          const after = lastMessage?.createdAt;
          const response = await fetchWithTimeout(
            `/api/chat/conversations/${conversationId}/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`,
            {
              credentials: 'same-origin',
              headers: {
                'x-chat-access-token': accessToken,
                ...(guestToken ? { 'x-chat-guest-token': guestToken } : {}),
              },
            }
          );

          if (response.ok) {
            const data = (await response.json()) as {
              status: ChatConversationStatus;
              messages: ChatMessage[];
            };

            if (data.status === 'closed') {
              clearChatStorage();
              resetConversationState();
              await initConversation();
              return;
            }

            setChatStatus(data.status);
            if (data.messages.length > 0) {
              setMessages((prev) => {
                const ids = new Set(prev.map((message) => message.id));
                const next = [...prev];
                for (const message of data.messages) {
                  if (!ids.has(message.id)) next.push(message);
                }
                return next;
              });
            }
          }
        } catch {
          // keep existing conversation visible
        }
        return;
      }

      if (storedId && storedAccess) {
        try {
          const response = await fetchWithTimeout(`/api/chat/conversations/${storedId}/messages`, {
            credentials: 'same-origin',
            headers: {
              'x-chat-access-token': storedAccess,
              ...(storedGuest ? { 'x-chat-guest-token': storedGuest } : {}),
            },
          });

          if (response.ok) {
            const data = (await response.json()) as {
              status: ChatConversationStatus;
              messages: ChatMessage[];
            };

            if (data.status !== 'closed') {
              setConversationId(storedId);
              setAccessToken(storedAccess);
              setGuestToken(storedGuest);
              setChatStatus(data.status);
              setMessages(data.messages);
              return;
            }
          }
        } catch {
          // fall through to re-init
        }

        clearChatStorage();
        resetConversationState();
      }

      await initConversation();
    } catch {
      setError(t('liveChatInitError'));
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    chatStatus,
    conversationId,
    guestToken,
    initConversation,
    resetConversationState,
    sessionStatus,
    t,
  ]);

  const startNewConversation = useCallback(async () => {
    clearChatStorage();
    resetConversationState();
    preparedForOpenRef.current = true;
    setLoading(true);
    setError('');
    try {
      await initConversation();
    } catch {
      setError(t('liveChatInitError'));
    } finally {
      setLoading(false);
    }
  }, [initConversation, resetConversationState, t]);

  useEffect(() => {
    if (!open) {
      preparedForOpenRef.current = false;
      return;
    }
    if (sessionStatus === 'loading' || preparedForOpenRef.current) return;
    preparedForOpenRef.current = true;
    void prepareConversation();
  }, [open, sessionStatus, session?.user?.id, prepareConversation]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
      clearChatStorage();
      resetConversationState();
      preparedForOpenRef.current = false;
      if (open) void prepareConversation();
    }
    prevUserIdRef.current = userId;
  }, [open, prepareConversation, resetConversationState, session?.user?.id]);

  async function postMessage(text: string) {
    if (!text || !conversationId || !accessToken || sending) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          accessToken,
          guestToken,
        }),
      });

      if (!response.ok) throw new Error('send');

      const data = (await response.json()) as {
        status: ChatConversationStatus;
        messages: ChatMessage[];
      };

      setChatStatus(data.status);
      setMessages(data.messages);
    } catch {
      setError(t('liveChatSendError'));
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await postMessage(text);
  }

  async function sendQuickTopic(message: string) {
    await postMessage(message);
  }

  async function requestAdmin() {
    if (!conversationId || !accessToken || escalating) return;

    setEscalating(true);
    setError('');

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/escalate`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, guestToken }),
      });

      if (!response.ok) throw new Error('escalate');

      const data = (await response.json()) as {
        status: ChatConversationStatus;
        messages: ChatMessage[];
      };

      setChatStatus(data.status);
      setMessages(data.messages);
    } catch {
      setError(t('liveChatEscalateError'));
    } finally {
      setEscalating(false);
    }
  }

  if (!enabled) {
    return null;
  }

  const statusLabel =
    chatStatus === 'human'
      ? t('liveChatStatusHuman')
      : chatStatus === 'closed'
        ? t('liveChatStatusClosed')
        : t('liveChatStatusBot');

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openChat}
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-br from-[var(--accent)] to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/40 transition hover:scale-105"
          aria-label={t('liveChatOpen')}
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
          <span>💬 {t('navLiveChat')}</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[60] flex h-[min(520px,calc(100vh-2rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-input)] px-4 py-3">
            <div>
              <p className="text-sm font-bold">{t('liveChatTitle')}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{statusLabel}</p>
            </div>
            <button
              type="button"
              onClick={closeChat}
              className="rounded-lg px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-white/5"
              aria-label={t('liveChatClose')}
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t('liveChatLoading')}</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${messageClass(message.sender)} ${message.sender === 'user' ? 'ml-auto' : ''}`}>
                  {message.sender !== 'system' && (
                    <p className="mb-0.5 text-[10px] font-bold opacity-70">
                      {senderLabel(message.sender, t)}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-red-300">{error}</p>
          )}

          <footer className="border-t border-[var(--border)] p-3">
            {chatStatus === 'bot' && !loading && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    disabled={sending || !conversationId}
                    onClick={() => void sendQuickTopic(topic.message)}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)] disabled:opacity-50"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            )}

            {chatStatus === 'bot' && (
              <button
                type="button"
                disabled={escalating || loading}
                onClick={() => void requestAdmin()}
                className="mb-2 w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
              >
                {escalating ? t('liveChatEscalating') : t('liveChatRequestAdmin')}
              </button>
            )}

            {chatStatus !== 'closed' ? (
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('liveChatPlaceholder')}
                  disabled={loading || sending}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={loading || sending || !draft.trim()}
                  className="btn-primary shrink-0 px-3 py-2 text-xs"
                >
                  {sending ? '…' : t('liveChatSend')}
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-xs text-[var(--text-muted)]">{t('liveChatClosedHint')}</p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void startNewConversation()}
                  className="btn-primary w-full px-3 py-2 text-xs"
                >
                  {loading ? t('liveChatLoading') : t('liveChatNewConversation')}
                </button>
              </div>
            )}

            {error && chatStatus !== 'closed' && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void startNewConversation()}
                className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text)] disabled:opacity-50"
              >
                {t('liveChatNewConversation')}
              </button>
            )}
          </footer>
        </div>
      )}
    </>
  );
}
