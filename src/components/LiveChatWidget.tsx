'use client';

import { ChatMessage, ChatConversationStatus } from '@/types/chat';
import { useLiveChat } from '@/contexts/live-chat-context';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import ChatTypingIndicator from '@/components/ChatTypingIndicator';
import ChatGuestIntroForm, { GuestProfile } from '@/components/ChatGuestIntroForm';
import ChatEditableMessage from '@/components/ChatEditableMessage';
import { mergeChatMessages } from '@/lib/chat-edit';
import { ChatTypingStatus, useChatTyping } from '@/hooks/useChatTyping';

const STORAGE_GUEST = 'chat_guest_token';
const STORAGE_CONVERSATION = 'chat_conversation_id';
const STORAGE_ACCESS = 'chat_access_token';
const STORAGE_GUEST_PROFILE = 'chat_guest_profile';

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

function getSourcePage(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}

function loadGuestProfile(): GuestProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_GUEST_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestProfile;
    if (!parsed.name?.trim()) return null;
    return {
      name: parsed.name.trim(),
      email: parsed.email?.trim() ?? '',
      phone: parsed.phone?.trim() ?? '',
    };
  } catch {
    return null;
  }
}

function saveGuestProfile(profile: GuestProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_GUEST_PROFILE, JSON.stringify(profile));
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
      return 'border border-emerald-600/30 bg-emerald-500/15 text-[var(--text)]';
    case 'bot':
      return 'border border-indigo-600/30 bg-indigo-500/15 text-[var(--text)]';
    default:
      return 'bg-[var(--bg-input)] text-[var(--text-muted)] text-center text-xs italic';
  }
}

function messageBubbleClass(sender: ChatMessage['sender']): string {
  const base = messageClass(sender);
  if (sender === 'admin') return `${base} live-chat-bubble--admin`;
  if (sender === 'bot') return `${base} live-chat-bubble--bot`;
  return base;
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
  const [peerTyping, setPeerTyping] = useState<ChatTypingStatus>({ user: false, admin: false });
  const [view, setView] = useState<'intro' | 'chat'>('chat');
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editTick, setEditTick] = useState(0);
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
    setPeerTyping({ user: false, admin: false });
    setEditingMessageId(null);
    setEditDraft('');
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, peerTyping.admin, scrollToBottom]);

  const sendTyping = useCallback(
    async (typing: boolean) => {
      if (!conversationId || !accessToken) return;
      try {
        await fetch(`/api/chat/conversations/${conversationId}/typing`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            typing,
            accessToken,
            guestToken,
          }),
        });
      } catch {
        // ignore typing heartbeat failures
      }
    },
    [accessToken, conversationId, guestToken]
  );

  useEffect(() => {
    if (!open || view !== 'chat') return;
    const intervalId = window.setInterval(() => setEditTick((value) => value + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [open, view]);

  useChatTyping({
    enabled: open && chatStatus !== 'closed',
    conversationId,
    draft,
    sendTyping,
  });

  const initConversation = useCallback(async (profile?: GuestProfile) => {
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
        guestName: profile?.name,
        guestEmail: profile?.email || undefined,
        guestPhone: profile?.phone || undefined,
        sourcePage: getSourcePage(),
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
    setView('chat');
  }, [session?.user?.id, session?.user?.name, sessionStatus]);

  const pollMessages = useCallback(async (forceFullSync = false) => {
    if (!conversationId || !accessToken) return;

    const lastMessage = messagesRef.current[messagesRef.current.length - 1];
    const after = forceFullSync ? undefined : lastMessage?.createdAt;

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
        typing?: ChatTypingStatus;
      };

      setChatStatus(data.status);
      if (data.typing) {
        setPeerTyping(data.typing);
      }

      if (forceFullSync) {
        setMessages(data.messages);
        return;
      }

      if (data.messages.length > 0) {
        setMessages((prev) => mergeChatMessages(prev, data.messages));
      }
    } catch {
      // silent poll failure
    }
  }, [accessToken, conversationId, guestToken]);

  useEffect(() => {
    if (!open || !conversationId) return;

    let pollCount = 0;
    const intervalId = window.setInterval(() => {
      pollCount += 1;
      void pollMessages(pollCount % 8 === 0);
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
              typing?: ChatTypingStatus;
            };

            if (data.status === 'closed') {
              clearChatStorage();
              resetConversationState();
              if (session?.user?.id) {
                await initConversation();
              } else {
                const savedProfile = loadGuestProfile();
                if (savedProfile) {
                  await initConversation(savedProfile);
                } else {
                  setGuestProfile(null);
                  setView('intro');
                }
              }
              return;
            }

            setView('chat');
            setChatStatus(data.status);
            if (data.typing) {
              setPeerTyping(data.typing);
            }
            if (data.messages.length > 0) {
              setMessages((prev) => mergeChatMessages(prev, data.messages));
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
              typing?: ChatTypingStatus;
            };

            if (data.status !== 'closed') {
              setConversationId(storedId);
              setAccessToken(storedAccess);
              setGuestToken(storedGuest);
              setChatStatus(data.status);
              setMessages(data.messages);
              if (data.typing) {
                setPeerTyping(data.typing);
              }
              setView('chat');
              return;
            }
          }
        } catch {
          // fall through to re-init
        }

        clearChatStorage();
        resetConversationState();
      }

      if (session?.user?.id) {
        await initConversation();
        return;
      }

      const savedProfile = loadGuestProfile();
      if (savedProfile) {
        await initConversation(savedProfile);
        return;
      }

      setGuestProfile(null);
      setView('intro');
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
    session?.user?.id,
    sessionStatus,
    t,
  ]);

  async function handleGuestIntroSubmit(profile: GuestProfile) {
    setLoading(true);
    setError('');
    saveGuestProfile(profile);
    setGuestProfile(profile);
    try {
      await initConversation(profile);
    } catch {
      setError(t('liveChatInitError'));
      setView('intro');
    } finally {
      setLoading(false);
    }
  }

  const startNewConversation = useCallback(async () => {
    clearChatStorage();
    resetConversationState();
    preparedForOpenRef.current = true;
    setLoading(true);
    setError('');
    try {
      if (session?.user?.id) {
        await initConversation();
        return;
      }
      const savedProfile = loadGuestProfile();
      if (savedProfile) {
        await initConversation(savedProfile);
        return;
      }
      setGuestProfile(null);
      setView('intro');
    } catch {
      setError(t('liveChatInitError'));
    } finally {
      setLoading(false);
    }
  }, [initConversation, resetConversationState, session?.user?.id, t]);

  useEffect(() => {
    if (!open) {
      preparedForOpenRef.current = false;
      return;
    }
    if (sessionStatus === 'loading' || preparedForOpenRef.current) return;
    preparedForOpenRef.current = true;
    if (session?.user?.id) {
      setView('chat');
    }
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
    void sendTyping(false);

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          accessToken,
          guestToken,
          sourcePage: getSourcePage(),
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

  async function saveMessageEdit(messageId: string) {
    if (!conversationId || !accessToken || !editDraft.trim() || editSaving) return;

    setEditSaving(true);
    setError('');

    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages/${messageId}`,
        {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: editDraft.trim(),
            accessToken,
            guestToken,
          }),
        }
      );

      if (response.status === 409) {
        setError(t('liveChatEditExpired'));
        setEditingMessageId(null);
        setEditDraft('');
        return;
      }

      if (!response.ok) throw new Error('edit');

      const data = (await response.json()) as {
        status: ChatConversationStatus;
        messages: ChatMessage[];
      };

      setChatStatus(data.status);
      setMessages(data.messages);
      setEditingMessageId(null);
      setEditDraft('');
    } catch {
      setError(t('liveChatEditError'));
    } finally {
      setEditSaving(false);
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    await postMessage(text);
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
            {view === 'intro' ? (
              <ChatGuestIntroForm
                initialProfile={guestProfile ?? undefined}
                loading={loading}
                error={error || undefined}
                onSubmit={(profile) => void handleGuestIntroSubmit(profile)}
                labels={{
                  title: t('liveChatIntroTitle'),
                  subtitle: t('liveChatIntroSubtitle'),
                  name: t('liveChatIntroName'),
                  namePlaceholder: t('liveChatIntroNamePlaceholder'),
                  email: t('liveChatIntroEmail'),
                  emailPlaceholder: t('liveChatIntroEmailPlaceholder'),
                  phone: t('liveChatIntroPhone'),
                  phonePlaceholder: t('liveChatIntroPhonePlaceholder'),
                  submit: t('liveChatIntroSubmit'),
                  nameRequired: t('liveChatIntroNameRequired'),
                }}
              />
            ) : loading ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t('liveChatLoading')}</p>
            ) : (
              messages.map((message) =>
                message.sender === 'user' ? (
                  <ChatEditableMessage
                    key={message.id}
                    message={message}
                    bubbleClassName={`${messageBubbleClass(message.sender)} ml-auto`}
                    alignEnd
                    senderLabel={senderLabel(message.sender, t)}
                    canEdit={chatStatus !== 'closed'}
                    editTick={editTick}
                    editing={editingMessageId === message.id}
                    editDraft={editingMessageId === message.id ? editDraft : message.body}
                    saving={editSaving}
                    onStartEdit={() => {
                      setEditingMessageId(message.id);
                      setEditDraft(message.body);
                    }}
                    onCancelEdit={() => {
                      setEditingMessageId(null);
                      setEditDraft('');
                    }}
                    onDraftChange={setEditDraft}
                    onSaveEdit={() => void saveMessageEdit(message.id)}
                    labels={{
                      edit: t('liveChatEdit'),
                      save: t('liveChatEditSave'),
                      cancel: t('liveChatEditCancel'),
                      edited: t('liveChatEdited'),
                    }}
                  />
                ) : (
                  <div key={message.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${messageBubbleClass(message.sender)}`}>
                    {message.sender !== 'system' && (
                      <p className="mb-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                        {senderLabel(message.sender, t)}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    {message.editedAt && message.sender !== 'system' && (
                      <p className="mt-1 text-[10px] italic text-[var(--text-muted)]">{t('liveChatEdited')}</p>
                    )}
                  </div>
                )
              )
            )}
            {peerTyping.admin && (
              <ChatTypingIndicator label={t('liveChatTypingAdmin')} />
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && view !== 'intro' && (
            <p className="border-t border-[var(--border)] px-3 py-2 text-xs text-red-300">{error}</p>
          )}

          {view !== 'intro' && (
          <footer className="border-t border-[var(--border)] p-3">
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
          )}
        </div>
      )}
    </>
  );
}
