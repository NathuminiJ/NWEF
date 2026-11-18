import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { screeningReviewSchema } from '@/lib/validation';
import { submitScreeningReview } from '@/services/screening';

export const runtime = 'nodejs';

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = screeningReviewSchema.parse(await jsonBody(request));
  return ok(await submitScreeningReview(await requireUser(), id, body));
});
