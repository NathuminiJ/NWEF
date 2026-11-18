import { created, jsonBody, requireUser, route } from '@/lib/api';
import { trusteeBatchSchema } from '@/lib/validation';
import { batchDecide } from '@/services/trustee';

export const runtime = 'nodejs';

export const POST = route(async (request) => {
  const body = trusteeBatchSchema.parse(await jsonBody(request));
  return created(await batchDecide(await requireUser(), body));
});
