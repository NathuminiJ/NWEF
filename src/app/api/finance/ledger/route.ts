import { ok, requireUser, route } from '@/lib/api';
import { getLedger } from '@/services/finance';
import { PERMISSIONS, assertCan } from '@/lib/rbac';

export const runtime = 'nodejs';

export const GET = route(async () => {
  const user = await requireUser();
  assertCan(user.role, PERMISSIONS.FINANCE_LEDGER_READ);
  return ok(await getLedger());
});
