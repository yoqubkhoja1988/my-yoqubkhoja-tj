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
  useRef,
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

function mergeSessionPermissions(session: Session, permissions: UserPermissions): Session {
  return {
    ...session,
    user: {
      ...session.user,
      permissions,
      role: 'user' as const,
    },
  };
}

export function UserPermissionsProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const permissionsRef = useRef<UserPermissions | null>(null);
  permissionsRef.current = permissions;

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
      await update();
      const response = await fetch(`/api/auth/permissions?t=${Date.now()}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) {
        setPermissions(session.user?.permissions ?? permissionsRef.current);
        return;
      }
      const data = (await response.json()) as { permissions?: UserPermissions | null };
      setPermissions(data.permissions ?? null);
    } catch {
      setPermissions(session.user?.permissions ?? permissionsRef.current);
    } finally {
      setLoading(false);
    }
  }, [session, status, update]);

  useEffect(() => {
    if (status === 'loading') return;
    setLoading(true);
    void refresh();
  }, [status, session?.user?.id, refresh]);

  useEffect(() => {
    if (status !== 'authenticated' || isSiteAdmin(session)) return;

    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(() => {
      void refresh();
    }, 15_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
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
  const { permissions } = useUserPermissionsState();

  const data = useMemo(() => {
    if (!session) return null;
    if (isSiteAdmin(session)) return session;
    if (permissions) {
      return mergeSessionPermissions(session, permissions);
    }
    return session;
  }, [session, permissions]);

  return { data, status };
}
