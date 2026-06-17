'use client';

import { isSiteAdmin } from '@/lib/is-admin';
import { UserPermissions } from '@/types/user';
import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { useRouter } from '@/i18n/navigation';
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
  permissionsUpdatedAt: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UserPermissionsContext = createContext<PermissionsState>({
  permissions: null,
  permissionsUpdatedAt: null,
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

function permissionsFingerprint(permissions: UserPermissions | null): string {
  if (!permissions) return '';
  return JSON.stringify(permissions);
}

export function UserPermissionsProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [permissionsUpdatedAt, setPermissionsUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const permissionsRef = useRef<UserPermissions | null>(null);
  const permissionsUpdatedAtRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  permissionsRef.current = permissions;
  permissionsUpdatedAtRef.current = permissionsUpdatedAt;
  userIdRef.current = session?.user?.id ?? null;

  const refresh = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      setPermissions(null);
      setPermissionsUpdatedAt(null);
      setLoading(false);
      return;
    }

    if (isSiteAdmin(session)) {
      setPermissions(null);
      setPermissionsUpdatedAt(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/permissions?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        if (permissionsRef.current === null) {
          setPermissions(session.user?.permissions ?? null);
        }
        return;
      }

      const data = (await response.json()) as {
        permissions?: UserPermissions | null;
        updatedAt?: string | null;
      };

      const nextPermissions = data.permissions ?? null;
      const nextUpdatedAt = data.updatedAt ?? null;
      const changed =
        permissionsFingerprint(permissionsRef.current) !== permissionsFingerprint(nextPermissions) ||
        permissionsUpdatedAtRef.current !== nextUpdatedAt;

      setPermissions(nextPermissions);
      setPermissionsUpdatedAt(nextUpdatedAt);

      if (nextPermissions) {
        try {
          await update({ permissions: nextPermissions });
        } catch {
          // JWT sync is optional; API permissions remain the source of truth.
        }
      }

      if (changed) {
        router.refresh();
      }
    } catch {
      if (permissionsRef.current === null) {
        setPermissions(session.user?.permissions ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [router, session, status, update]);

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
    }, 5_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [refresh, session, status]);

  const value = useMemo(
    () => ({
      permissions,
      permissionsUpdatedAt,
      loading,
      refresh,
    }),
    [permissions, permissionsUpdatedAt, loading, refresh]
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
