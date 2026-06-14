'use client';

import { useEffect, useRef } from 'react';

export type ChatTypingStatus = {
  user: boolean;
  admin: boolean;
};

type UseChatTypingOptions = {
  enabled: boolean;
  conversationId: string | null;
  draft: string;
  sendTyping: (typing: boolean) => Promise<void>;
};

export function useChatTyping({
  enabled,
  conversationId,
  draft,
  sendTyping,
}: UseChatTypingOptions): void {
  const sendTypingRef = useRef(sendTyping);
  sendTypingRef.current = sendTyping;

  const typingActiveRef = useRef(false);
  const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    const hasDraft = draft.trim().length > 0;

    if (hasDraft) {
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        void sendTypingRef.current(true);
      }

      if (heartbeatRef.current === null) {
        heartbeatRef.current = window.setInterval(() => {
          if (typingActiveRef.current) {
            void sendTypingRef.current(true);
          }
        }, 2000);
      }
      return;
    }

    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      void sendTypingRef.current(false);
    }

    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, [conversationId, draft, enabled]);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    return () => {
      if (heartbeatRef.current !== null) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (typingActiveRef.current) {
        typingActiveRef.current = false;
        void sendTypingRef.current(false);
      }
    };
  }, [conversationId, enabled]);
}
