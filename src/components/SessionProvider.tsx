'use client';

import LiveChatWidget from '@/components/LiveChatWidget';
import UserPresenceTracker from '@/components/UserPresenceTracker';
import { LiveChatProvider } from '@/contexts/live-chat-context';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <LiveChatProvider>
        <UserPresenceTracker />
        <LiveChatWidget />
        {children}
      </LiveChatProvider>
    </NextAuthSessionProvider>
  );
}
