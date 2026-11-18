import { config } from '@/lib/config';
import { ok, route, jsonBody } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, sessionCookieOptions } from '@/lib/auth/session';
import { verifyOtp } from '@/lib/auth/otp';
import { otpVerifySchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = route(async (request) => {
  const body = otpVerifySchema.parse(await jsonBody(request));
  const meta = await getRequestMeta();
  const result = await verifyOtp(body.identifier, body.code, meta);
  await writeAudit({
    actorId: result.user.id,
    actorRole: result.user.role,
    action: 'LOGIN',
    entityType: 'User',
    entityId: result.user.id,
    ...meta,
  });

  const response = ok({ user: result.user, expiresAt: result.expiresAt });
  response.cookies.set(config.cookieName, result.token, sessionCookieOptions(result.expiresAt));
  return response;
});
