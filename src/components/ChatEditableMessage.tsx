'use client';

import { ChatMessage } from '@/types/chat';
import { canEditChatMessage, getChatMessageEditSecondsLeft } from '@/lib/chat-edit';
import { FormEvent } from 'react';

type Props = {
  message: ChatMessage;
  bubbleClassName: string;
  alignEnd?: boolean;
  senderLabel?: string;
  canEdit: boolean;
  editTick: number;
  editing: boolean;
  editDraft: string;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  labels: {
    edit: string;
    save: string;
    cancel: string;
    edited: string;
  };
};

export default function ChatEditableMessage({
  message,
  bubbleClassName,
  alignEnd = false,
  senderLabel,
  canEdit,
  editTick,
  editing,
  editDraft,
  saving,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSaveEdit,
  labels,
}: Props) {
  void editTick;

  const editable = canEdit && canEditChatMessage(message);
  const secondsLeft = getChatMessageEditSecondsLeft(message);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSaveEdit();
  }

  return (
    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${bubbleClassName} ${alignEnd ? 'ml-auto' : ''}`}>
      {senderLabel && (
        <p className="mb-0.5 text-[10px] font-bold text-[var(--text-muted)]">{senderLabel}</p>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={editDraft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={3}
            disabled={saving}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || !editDraft.trim()} className="btn-primary px-2 py-1 text-[10px]">
              {saving ? '…' : labels.save}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onCancelEdit}
              className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)]"
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <div className={`mt-1 flex flex-wrap items-center gap-2 ${alignEnd ? 'justify-end' : ''}`}>
            {message.editedAt && (
              <span className="text-[10px] italic text-[var(--text-muted)]">{labels.edited}</span>
            )}
            {editable && (
              <button
                type="button"
                onClick={onStartEdit}
                className="text-[10px] font-semibold text-[var(--accent)] hover:underline"
              >
                {labels.edit} · {secondsLeft}s
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
