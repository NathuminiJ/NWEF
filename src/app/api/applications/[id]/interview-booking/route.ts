import { z } from 'zod';
import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { bookInterview } from '@/services/applications';

export const runtime = 'nodejs';

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const { slotId } = z.object({ slotId: z.string().uuid() }).parse(await jsonBody(request));
  return ok(await bookInterview(await requireUser(), id, slotId));
});
