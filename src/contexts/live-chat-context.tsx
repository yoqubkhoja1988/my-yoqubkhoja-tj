'use client';

import { isLiveChatEnabled } from '@/lib/live-chat-config';
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

type LiveChatContextValue = {
  enabled: boolean;
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
};

const LiveChatContext = createContext<LiveChatContextValue | null>(null);

export function LiveChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const enabled = isLiveChatEnabled();

  const openChat = useCallback(() => {
    if (enabled) setOpen(true);
  }, [enabled]);

  const closeChat = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ enabled, open, openChat, closeChat }),
    [enabled, open, openChat, closeChat]
  );

  return <LiveChatContext.Provider value={value}>{children}</LiveChatContext.Provider>;
}

export function useLiveChat(): LiveChatContextValue {
  const context = useContext(LiveChatContext);
  if (!context) {
    return {
      enabled: false,
      open: false,
      openChat: () => {},
      closeChat: () => {},
    };
  }
  return context;
}
