import { created, jsonBody, ok, requireUser, route } from '@/lib/api';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { invoiceSchema } from '@/lib/validation';
import { createInvoice, listInvoices } from '@/services/finance';

export const runtime = 'nodejs';

export const GET = route(async () => {
  const user = await requireUser();
  assertCan(user.role, PERMISSIONS.FINANCE_LEDGER_READ);
  return ok(await listInvoices());
});

export const POST = route(async (request) => {
  const user = await requireUser();
  assertCan(user.role, PERMISSIONS.FINANCE_MANAGE);
  const body = invoiceSchema.parse(await jsonBody(request));
  return created(await createInvoice(user, body));
});
