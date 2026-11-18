import { z } from 'zod';
import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { activateAward } from '@/services/finance';

export const runtime = 'nodejs';

const schema = z.object({
  instalments: z
    .array(
      z.object({
        sequence: z.number().int().positive(),
        amount: z.number().positive(),
        dueDate: z.coerce.date(),
        invoiceId: z.string().uuid().optional(),
      }),
    )
    .min(1),
});

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = schema.parse(await jsonBody(request));
  return ok(await activateAward(await requireUser(), id, body));
});
