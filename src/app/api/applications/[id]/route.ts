import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { applicationPatchSchema } from '@/lib/validation';
import { getApplicationDetail, updateDraft } from '@/services/applications';

export const runtime = 'nodejs';

export const GET = route(async (_request, context) => {
  const { id } = await context.params;
  return ok(await getApplicationDetail(id, await requireUser()));
});

export const PATCH = route(async (request, context) => {
  const { id } = await context.params;
  const body = applicationPatchSchema.parse(await jsonBody(request));
  return ok(await updateDraft(await requireUser(), id, body));
});
