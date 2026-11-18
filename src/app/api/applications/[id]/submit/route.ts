import { ok, requireUser, route } from '@/lib/api';
import { submitApplication } from '@/services/applications';

export const runtime = 'nodejs';

export const POST = route(async (_request, context) => {
  const { id } = await context.params;
  return ok(await submitApplication(await requireUser(), id));
});
