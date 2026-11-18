import { ok, route, jsonBody } from '@/lib/api';
import { getRequestMeta } from '@/lib/auth/session';
import { requestOtp } from '@/lib/auth/otp';
import { otpRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = route(async (request) => {
  const body = otpRequestSchema.parse(await jsonBody(request));
  const result = await requestOtp(body.phone, await getRequestMeta());
  return ok(result);
});
