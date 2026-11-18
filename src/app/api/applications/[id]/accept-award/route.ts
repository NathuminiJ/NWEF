import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { acceptAwardSchema } from '@/lib/validation';
import { acceptAward } from '@/services/applications';

export const runtime = 'nodejs';

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = acceptAwardSchema.parse(await jsonBody(request));
  return ok(await acceptAward(await requireUser(), id, body));
});
