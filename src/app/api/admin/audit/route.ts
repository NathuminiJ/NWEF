import { ok, requireUser, route } from '@/lib/api';
import { getAuditLogs } from '@/services/admin';

export const runtime = 'nodejs';

export const GET = route(async (request) => {
  const params = new URL(request.url).searchParams;
  return ok(
    await getAuditLogs(await requireUser(), {
      entityType: params.get('entityType') ?? undefined,
      entityId: params.get('entityId') ?? undefined,
      action: params.get('action') ?? undefined,
      take: Number(params.get('take')) || 100,
    }),
  );
});
