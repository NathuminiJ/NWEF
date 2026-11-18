import { z } from 'zod';
import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { resolveDataRequest } from '@/services/admin';

export const runtime = 'nodejs';

const schema = z.object({
  resolution: z.string().trim().min(5).max(4000),
  status: z.enum(['COMPLETED', 'REJECTED']).default('COMPLETED'),
});

export const PATCH = route(async (request, context) => {
  const { id } = await context.params;
  const body = schema.parse(await jsonBody(request));
  return ok(await resolveDataRequest(await requireUser(), id, body.resolution, body.status));
});
