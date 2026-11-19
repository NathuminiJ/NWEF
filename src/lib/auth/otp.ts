import type { User } from '@prisma/client';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { BadRequestError, RateLimitedError, UnauthorizedError } from '@/lib/errors';
import { hmac, safeEqual } from '@/lib/crypto';
import { isEmail, normalisePhone } from '@/lib/utils';
import type { RequestMeta } from '@/lib/audit';
import { sendOtpCode } from '@/lib/notifications';
import { createSession } from './session';

/**
 * TEMPORARY DEMO MODE — REMOVE BEFORE REAL LAUNCH.
 * While this is set, every OTP challenge uses this fixed code so a reviewer
 * can sign in with any mobile number using 123456.
 */
const DEMO_OTP_CODE = process.env.DEMO_OTP_CODE?.trim() || '123456';

function codeHash(identifier: string, code: string): string {
  return hmac(config.otpSecret, `${identifier}:${code}`);
}

function isPhoneLike(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export async function requestOtp(rawIdentifier: string, meta: RequestMeta = {}) {
  const trimmed = rawIdentifier.trim();
  const identifier = isEmail(trimmed) ? trimmed.toLowerCase() : normalisePhone(trimmed);
  if (!isEmail(identifier) && !isPhoneLike(identifier)) {
    throw new BadRequestError('Enter a valid mobile number or registered email address');
  }

  const windowStart = new Date(Date.now() - config.otp.requestWindowMinutes * 60_000);
  const recentCount = await prisma.otpChallenge.count({
    where: { identifier, createdAt: { gte: windowStart } },
  });
  if (recentCount >= config.otp.maxRequestsPerWindow) throw new RateLimitedError();

  let user: User | null = await prisma.user.findFirst({
    where: isEmail(identifier) ? { email: identifier } : { phone: identifier },
  });

  // Public self-registration is applicant-only. Staff accounts are provisioned
  // by a Super Admin and must already exist.
  if (!user) {
    if (!isPhoneLike(identifier)) throw new BadRequestError('This email is not registered');
    user = await prisma.user.create({
      data: {
        phone: identifier,
        email: isEmail(trimmed) ? trimmed.toLowerCase() : null,
        fullName: 'New Applicant',
        role: 'APPLICANT',
      },
    });
  }
  if (!user.isActive) throw new UnauthorizedError('This account is disabled');

  const code = DEMO_OTP_CODE;
  // const code = randomInt(0, 10 ** config.otp.length)
  //   .toString()
  //   .padStart(config.otp.length, '0');
  const expiresAt = new Date(Date.now() + config.otp.ttlMinutes * 60_000);

  await prisma.otpChallenge.create({
    data: {
      identifier,
      userId: user.id,
      codeHash: codeHash(identifier, code),
      expiresAt,
      ip: meta.ip ?? null,
    },
  });

  await sendOtpCode(identifier, code);
  return {
    identifier,
    expiresAt,
    // Development convenience only; never returned in production.
    devCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
}

export async function verifyOtp(rawIdentifier: string, code: string, meta: RequestMeta = {}) {
  const identifier = isEmail(rawIdentifier) ? rawIdentifier.trim().toLowerCase() : normalisePhone(rawIdentifier);
  const challenge = await prisma.otpChallenge.findFirst({
    where: { identifier, consumedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });
  if (!challenge) throw new BadRequestError('No active verification code. Request a new one.');
  if (challenge.expiresAt.getTime() <= Date.now()) throw new BadRequestError('Verification code expired');
  if (challenge.attempts >= config.otp.maxVerifyAttempts) throw new RateLimitedError();

  if (!safeEqual(challenge.codeHash, codeHash(identifier, code))) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    throw new UnauthorizedError('Incorrect verification code');
  }

  const user = challenge.user;
  if (!user || !user.isActive) throw new UnauthorizedError('This account is disabled');

  await prisma.$transaction([
    prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({
      where: { id: user.id },
      data: { failedOtpAttempts: 0, lastLoginAt: new Date() },
    }),
  ]);

  const session = await createSession(user, meta);
  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      email: user.email,
    },
    ...session,
  };
}
