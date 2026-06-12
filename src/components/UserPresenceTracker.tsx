'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const HEARTBEAT_MS = 30_000;

export default function UserPresenceTracker() {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'authenticated') return;

    async function ping() {
      await fetch('/api/users/presence', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname }),
      }).catch(() => {});
    }

    void ping();

    const intervalId = window.setInterval(() => {
      void ping();
    }, HEARTBEAT_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void ping();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, pathname]);

  return null;
}
