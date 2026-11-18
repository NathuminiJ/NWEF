import { created, jsonBody, ok, requirePermission, requireUser, route } from '@/lib/api';
import { PERMISSIONS } from '@/lib/rbac';
import { applicationCreateSchema } from '@/lib/validation';
import { createApplication, listApplications } from '@/services/applications';

export const runtime = 'nodejs';

export const GET = route(async (request) => {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  return ok(
    await listApplications(user, {
      status: params.get('status') ?? undefined,
      stream: (params.get('stream') as 'OLD_TINITIAN_SUPPORT' | 'SPORTS_SCHOLARSHIP' | null) ?? undefined,
      search: params.get('search') ?? undefined,
    }),
  );
});

export const POST = route(async (request) => {
  const user = await requirePermission(PERMISSIONS.APPLICATION_CREATE);
  const body = applicationCreateSchema.parse(await jsonBody(request));
  return created(await createApplication(user, body));
});
