import { ApplicationStatus } from '@prisma/client';
import { z } from 'zod';
import { jsonBody, ok, requireUser, route } from '@/lib/api';
import { performTransition } from '@/services/workflow-service';

export const runtime = 'nodejs';

/**
 * Generic guarded transition endpoint for actions without extra side effects
 * (e.g. START_SCREENING, SCHEDULE_INTERVIEW via booking, MARK_INTERVIEWED).
 */
const schema = z.object({
  to: z.nativeEnum(ApplicationStatus),
  payload: z.record(z.unknown()).optional(),
  reason: z.string().max(2000).optional(),
});

export const POST = route(async (request, context) => {
  const { id } = await context.params;
  const body = schema.parse(await jsonBody(request));
  return ok(
    await performTransition({
      user: await requireUser(),
      applicationId: id,
      to: body.to,
      payload: body.payload,
      reason: body.reason,
    }),
  );
});
