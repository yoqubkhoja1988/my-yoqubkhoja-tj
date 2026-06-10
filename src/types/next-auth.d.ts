import { DefaultSession } from 'next-auth';
import { UserPermissions } from '@/types/user';

declare module 'next-auth' {
  interface Session {
    user: {
      role?: 'admin' | 'user';
      permissions?: UserPermissions;
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'admin' | 'user';
    permissions?: UserPermissions;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'user';
    permissions?: UserPermissions;
  }
}
