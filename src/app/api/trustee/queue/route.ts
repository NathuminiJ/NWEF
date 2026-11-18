import { ok, requireUser, route } from '@/lib/api';
import { getTrusteeQueue } from '@/services/trustee';
import { PERMISSIONS, assertCan } from '@/lib/rbac';

export const runtime = 'nodejs';

export const GET = route(async () => {
  const user = await requireUser();
  assertCan(user.role, PERMISSIONS.TRUSTEE_DECIDE);
  return ok(await getTrusteeQueue());
});
