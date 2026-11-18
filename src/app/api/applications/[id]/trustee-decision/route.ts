import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { trusteeDecisionSchema } from '@/lib/validation';
import { decide } from '@/services/trustee';

export const runtime = 'nodejs';

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = trusteeDecisionSchema.parse(await jsonBody(request));
  return ok(await decide(await requireUser(), id, body));
});
