'use client';

import { ChatConversationStatus, ChatMessage } from '@/types/chat';
import ChatVisitorBadge from '@/components/ChatVisitorBadge';
import ChatVisitorDetails from '@/components/ChatVisitorDetails';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ChatRegistryItem = {
  id: string;
  displayName: string;
  status: ChatConversationStatus;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: ChatMessage | null;
  userId: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  sourcePage?: string | null;
  visitorIp?: string | null;
};

const STATUS_CLASS: Record<ChatConversationStatus, string> = {
  bot: 'bg-indigo-500/20 text-indigo-300',
  human: 'bg-amber-500/20 text-amber-300',
  closed: 'bg-[var(--bg-input)] text-[var(--text-muted)]',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminChatRegistryPanel() {
  const t = useTranslations();
  const [requests, setRequests] = useState<ChatRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ChatRegistryItem | null>(null);
  const [detailMessages, setDetailMessages] = useState<ChatMessage[]>([]);

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/chat/registry', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('load');
      const data = (await response.json()) as { requests: ChatRegistryItem[] };
      setRequests(data.requests ?? []);
    } catch {
      setError(t('adminChatRegistryLoadError'));
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((item) => {
      const haystack = [
        item.displayName,
        item.guestEmail ?? '',
        item.guestPhone ?? '',
        item.sourcePage ?? '',
        item.visitorIp ?? '',
        item.lastMessage?.body ?? '',
        item.status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, search]);

  async function openRequest(item: ChatRegistryItem) {
    setSelectedRequest(item);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetailMessages([]);

    try {
      const response = await fetch(
        `/api/admin/chat/registry?conversationId=${encodeURIComponent(item.id)}`,
        { credentials: 'same-origin' }
      );
      if (!response.ok) throw new Error('detail');
      const data = (await response.json()) as { messages: ChatMessage[] };
      setDetailMessages(data.messages);
    } catch {
      setDetailError(t('adminChatRegistryDetailError'));
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedRequest(null);
    setDetailMessages([]);
    setDetailError('');
  }

  function statusLabel(status: ChatConversationStatus) {
    return {
      bot: t('adminChatStatusBot'),
      human: t('adminChatStatusHuman'),
      closed: t('adminChatStatusClosed'),
    }[status];
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted)]">{t('adminChatRegistryLoading')}</div>
    );
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="page-eyebrow">{t('adminChatRegistryEyebrow')}</p>
            <h3 className="text-lg font-bold">{t('adminChatRegistryTitle')}</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t('adminChatRegistrySubtitle')}</p>
          </div>
          <button type="button" onClick={() => void loadRegistry()} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
            {t('adminChatRegistryRefresh')}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-[var(--text-muted)]">{t('adminChatRegistryStatTotal')}</p>
            <p className="mt-1 text-2xl font-bold">{requests.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-[var(--text-muted)]">{t('adminChatRegistryStatGuests')}</p>
            <p className="mt-1 text-2xl font-bold">{requests.filter((item) => !item.userId).length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs uppercase text-[var(--text-muted)]">{t('adminChatRegistryStatRegistered')}</p>
            <p className="mt-1 text-2xl font-bold">{requests.filter((item) => item.userId).length}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="glass-card p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('adminChatRegistrySearchPlaceholder')}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="glass-card overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--text-muted)]">{t('adminChatRegistryEmpty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--bg-input)] text-left text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">{t('adminChatRegistryColDate')}</th>
                    <th className="px-4 py-3">{t('adminChatRegistryColVisitor')}</th>
                    <th className="px-4 py-3">{t('adminChatRegistryColStatus')}</th>
                    <th className="px-4 py-3">{t('adminChatRegistryColPreview')}</th>
                    <th className="px-4 py-3">{t('adminChatRegistryColMessages')}</th>
                    <th className="px-4 py-3 text-right">{t('adminChatRegistryColAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 align-top text-xs text-[var(--text-muted)]">
                        {formatDate(item.lastMessageAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{item.displayName}</span>
                          <ChatVisitorBadge conversation={item} compact />
                        </div>
                        {item.sourcePage && (
                          <p className="mt-1 max-w-xs truncate text-xs text-[var(--text-muted)]">{item.sourcePage}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLASS[item.status]}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3 align-top">
                        <p className="truncate text-xs text-[var(--text-muted)]">{item.lastMessage?.body ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-xs">{item.messageCount}</td>
                      <td className="px-4 py-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => void openRequest(item)}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          {t('adminChatRegistryOpen')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {detailOpen && selectedRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="text-sm font-bold">{t('adminChatRegistryDetailTitle')}</p>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-white/5"
                aria-label={t('adminChatRegistryClose')}
              >
                ✕
              </button>
            </div>

            <ChatVisitorDetails conversation={selectedRequest} />

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {detailLoading ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t('adminChatRegistryLoading')}</p>
              ) : detailError ? (
                <p className="text-sm text-red-300">{detailError}</p>
              ) : detailMessages.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">{t('adminChatRegistryNoMessages')}</p>
              ) : (
                detailMessages.map((message) => (
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
                    <p className="mt-1 text-[10px] opacity-60">{formatDate(message.createdAt)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[var(--border)] p-3">
              <button type="button" onClick={closeDetail} className="btn-secondary w-full px-3 py-2 text-xs">
                {t('adminChatRegistryClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
