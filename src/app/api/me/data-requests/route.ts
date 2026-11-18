import { created, jsonBody, requireUser, route } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta } from '@/lib/auth/session';
import { openDataSubjectRequest } from '@/lib/pdpa';
import { dataRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export const POST = route(async (request) => {
  const body = dataRequestSchema.parse(await jsonBody(request));
  const user = await requireUser();
  const record = await openDataSubjectRequest(user.id, body.type, body.details);
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'DATA_REQUEST_CREATED',
    entityType: 'DataSubjectRequest',
    entityId: record.id,
    metadata: { type: body.type },
    ...(await getRequestMeta()),
  });
  return created(record);
});
