import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { userRoleSchema } from '@/lib/validation';
import { updateUserRole } from '@/services/admin';

export const runtime = 'nodejs';

export const PATCH = route(async (request, context) => {
  const { id } = await context.params;
  const body = userRoleSchema.parse(await jsonBody(request));
  return ok(await updateUserRole(await requireUser(), id, body));
});
