import { NextResponse, type NextRequest } from 'next/server';
import { config as appConfig } from '@/lib/config';

const PROTECTED = ['/apply', '/applications', '/admin', '/screening', '/panel', '/trustee', '/finance', '/super-admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (needsAuth && !request.cookies.has(appConfig.cookieName)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
