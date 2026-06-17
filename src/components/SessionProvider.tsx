'use client';

import LiveChatWidget from '@/components/LiveChatWidget';
import UserPresenceTracker from '@/components/UserPresenceTracker';
import { UserPermissionsProvider } from '@/contexts/user-permissions-context';
import { LiveChatProvider } from '@/contexts/live-chat-context';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider refetchInterval={30} refetchOnWindowFocus>
      <UserPermissionsProvider>
        <LiveChatProvider>
          <UserPresenceTracker />
          <LiveChatWidget />
          {children}
        </LiveChatProvider>
      </UserPermissionsProvider>
    </NextAuthSessionProvider>
  );
}
