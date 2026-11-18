import { ok, requireUser, route } from '@/lib/api';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { listUsers } from '@/services/admin';

export const runtime = 'nodejs';

export const GET = route(async () => {
  const user = await requireUser();
  assertCan(user.role, PERMISSIONS.USER_MANAGE);
  return ok(await listUsers());
});
