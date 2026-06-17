'use client';

import { isSiteAdmin } from '@/lib/is-admin';
import { UserPermissions } from '@/types/user';
import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type PermissionsState = {
  permissions: UserPermissions | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UserPermissionsContext = createContext<PermissionsState>({
  permissions: null,
  loading: true,
  refresh: async () => {},
});

export function UserPermissionsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (status !== 'authenticated' || !session) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    if (isSiteAdmin(session)) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/permissions', { credentials: 'same-origin' });
      if (!response.ok) {
        setPermissions(session.user?.permissions ?? null);
        return;
      }
      const data = (await response.json()) as { permissions?: UserPermissions | null };
      setPermissions(data.permissions ?? null);
    } catch {
      setPermissions(session.user?.permissions ?? null);
    } finally {
      setLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    if (status === 'loading') return;
    setLoading(true);
    void refresh();
  }, [status, refresh]);

  useEffect(() => {
    if (status !== 'authenticated' || isSiteAdmin(session)) return;

    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [refresh, session, status]);

  const value = useMemo(
    () => ({
      permissions,
      loading,
      refresh,
    }),
    [permissions, loading, refresh]
  );

  return (
    <UserPermissionsContext.Provider value={value}>{children}</UserPermissionsContext.Provider>
  );
}

export function useUserPermissionsState(): PermissionsState {
  return useContext(UserPermissionsContext);
}

/** Client session merged with permissions loaded directly from the database. */
export function useAccessSession(): {
  data: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
} {
  const { data: session, status } = useSession();
  const { permissions, loading } = useUserPermissionsState();

  const data = useMemo(() => {
    if (!session) return null;
    if (isSiteAdmin(session)) return session;
    if (loading) return session;
    if (!permissions) return session;

    return {
      ...session,
      user: {
        ...session.user,
        permissions,
        role: 'user' as const,
      },
    };
  }, [session, permissions, loading]);

  return { data, status };
}
