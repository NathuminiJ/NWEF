import { ok, requireUser, route } from '@/lib/api';
import { markInterviewAttended } from '@/services/interviews';

export const runtime = 'nodejs';

export const POST = route(async (_request, context) => {
  const { id } = await context.params;
  return ok(await markInterviewAttended(await requireUser(), id));
});
