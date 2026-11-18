import { created, requireUser, route } from '@/lib/api';
import { createRenewal } from '@/services/applications';

export const runtime = 'nodejs';

export const POST = route(async (_request, context) => {
  const { id } = await context.params;
  return created(await createRenewal(await requireUser(), id));
});
