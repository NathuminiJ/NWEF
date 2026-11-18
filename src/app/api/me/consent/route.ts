import { z } from 'zod';
import { created, requireUser, route, jsonBody } from '@/lib/api';
import { getRequestMeta } from '@/lib/auth/session';
import { dataProtectionNotice } from '@/lib/constants';
import { recordConsent } from '@/lib/pdpa';

export const runtime = 'nodejs';

const schema = z.object({
  purpose: z.enum(['application_data', 'award_acceptance']).default('application_data'),
  accepted: z.literal(true),
});

export const POST = route(async (request) => {
  const body = schema.parse(await jsonBody(request));
  const user = await requireUser();
  const meta = await getRequestMeta();
  return created(
    await recordConsent(
      user.id,
      body.purpose,
      JSON.stringify(dataProtectionNotice),
      dataProtectionNotice.version,
      meta.ip,
    ),
  );
});
