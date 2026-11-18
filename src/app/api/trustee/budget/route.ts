import { ok, requireUser, route } from '@/lib/api';
import { budgets } from '@/services/trustee';
import { PERMISSIONS, assertCan } from '@/lib/rbac';

export const runtime = 'nodejs';

export const GET = route(async (request) => {
  const user = await requireUser();
  assertCan(user.role, PERMISSIONS.TRUSTEE_BUDGET_READ);
  const year = Number(new URL(request.url).searchParams.get('year')) || undefined;
  return ok(await budgets(year));
});
