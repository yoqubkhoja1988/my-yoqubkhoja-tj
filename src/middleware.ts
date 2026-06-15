import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/docs/')) {
    return new NextResponse(null, { status: 404 });
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(ru|en|tj|uz)/:path*', '/docs/:path*'],
};
