import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { infoResponseSchema } from '@/lib/validation';
import { respondInfo } from '@/services/applications';

export const runtime = 'nodejs';

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = infoResponseSchema.parse(await jsonBody(request));
  return ok(await respondInfo(await requireUser(), id, body.response));
});
