import { created, jsonBody, requireUser, route } from '@/lib/api';
import { paymentSchema } from '@/lib/validation';
import { recordPayment } from '@/services/finance';

export const runtime = 'nodejs';

export const POST = route(async (request) => {
  const body = paymentSchema.parse(await jsonBody(request));
  return created(await recordPayment(await requireUser(), body));
});
