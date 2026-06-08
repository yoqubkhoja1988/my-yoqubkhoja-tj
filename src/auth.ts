import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createHash } from 'crypto';

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        const expectedUser = process.env.AUTH_USERNAME || 'yoqub';
        const expectedHash =
          process.env.AUTH_PASSWORD_HASH ||
          'fc30043c381b6e6c79faae8309f4484ab9317a58ae4afaa328b5e926f350878f';

        if (username === expectedUser && hashPassword(password) === expectedHash) {
          return { id: '1', name: username };
        }
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/tj/login',
  },
});
