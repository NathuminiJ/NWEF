import { cookies, headers } from 'next/headers';
import type { Role, User } from '@prisma/client';
import { config } from '@/lib/config';
import { ROLE_SESSION_TIMEOUTS } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { UnauthorizedError } from '@/lib/errors';
import { hmac, randomToken } from '@/lib/crypto';
import type { RequestMeta } from '@/lib/audit';

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: Role;
  isActive: boolean;
  sessionId: string;
}

export async function getRequestMeta(): Promise<RequestMeta> {
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');
  return {
    ip: forwarded?.split(',')[0]?.trim() ?? store.get('x-real-ip') ?? null,
    userAgent: store.get('user-agent') ?? null,
  };
}

function hashToken(token: string): string {
  return hmac(config.sessionSecret, token);
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export async function createSession(user: User, meta: RequestMeta = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + ROLE_SESSION_TIMEOUTS[user.role]);
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
  return { token, expiresAt };
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(config.cookieName)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
  if (!session.user.isActive) return null;

  await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  return {
    id: session.user.id,
    phone: session.user.phone,
    email: session.user.email,
    fullName: session.user.fullName,
    role: session.user.role,
    isActive: session.user.isActive,
    sessionId: session.id,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError('Please sign in to continue');
  return user;
}
