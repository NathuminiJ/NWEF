import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { scoreSchema } from '@/lib/validation';
import { getScores, submitScore } from '@/services/interviews';
import { getAccessibleApplication } from '@/services/access';

export const runtime = 'nodejs';

export const GET = route(async (_request, context) => {
  const { id } = await context.params;
  await getAccessibleApplication(id, await requireUser());
  return ok(await getScores(id));
});

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = scoreSchema.parse(await jsonBody(request));
  return ok(await submitScore(await requireUser(), id, body));
});
