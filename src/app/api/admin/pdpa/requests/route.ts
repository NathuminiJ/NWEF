import { ok, requireUser, route } from '@/lib/api';
import { listDataRequests } from '@/services/admin';

export const runtime = 'nodejs';

export const GET = route(async () => ok(await listDataRequests(await requireUser())));
