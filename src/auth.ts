import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getAdminUsername, isSiteAdmin } from '@/lib/is-admin';
import { hashPassword, verifyPassword } from '@/lib/password-hash';
import { findUserByUsername } from '@/lib/users-store';
import { UserPermissions } from '@/types/user';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const username = (credentials?.username as string)?.trim();
        const password = credentials?.password as string;
        if (!username || !password) return null;

        const expectedUser = getAdminUsername();
        const expectedHash =
          process.env.AUTH_PASSWORD_HASH ||
          'fc30043c381b6e6c79faae8309f4484ab9317a58ae4afaa328b5e926f350878f';

        if (username === expectedUser && hashPassword(password) === expectedHash) {
          return { id: 'admin', name: username, role: 'admin' as const };
        }

        const storedUser = findUserByUsername(username);
        if (!storedUser || !verifyPassword(password, storedUser.passwordHash)) {
          return null;
        }

        if (storedUser.status !== 'approved') {
          return null;
        }

        return {
          id: storedUser.id,
          name: storedUser.username,
          role: 'user' as const,
          permissions: storedUser.permissions,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.permissions = user.permissions;
        if (user.id) {
          token.sub = user.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role === 'admin' ? 'admin' : 'user';
        if (token.sub) {
          session.user.id = token.sub;
        }
        session.user.permissions = token.permissions as UserPermissions | undefined;
        if (isSiteAdmin(session)) {
          session.user.permissions = undefined;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/tj/login',
  },
});
