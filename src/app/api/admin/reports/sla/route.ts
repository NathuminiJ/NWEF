import { ok, requireUser, route } from '@/lib/api';
import { slaReport } from '@/services/admin';

export const runtime = 'nodejs';

export const GET = route(async () => ok(await slaReport(await requireUser())));
