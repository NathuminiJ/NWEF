import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { infoRequestSchema } from '@/lib/validation';
import { requestInfo } from '@/services/applications';

export const runtime = 'nodejs';

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = infoRequestSchema.parse(await jsonBody(request));
  return ok(await requestInfo(await requireUser(), id, body.message, body.dueDays));
});
