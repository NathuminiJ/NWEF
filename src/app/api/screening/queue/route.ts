import { ok, requireUser, route } from '@/lib/api';
import { getScreeningQueue } from '@/services/screening';

export const runtime = 'nodejs';

export const GET = route(async () => ok(await getScreeningQueue(await requireUser())));
