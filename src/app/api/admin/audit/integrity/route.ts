import { ok, requireUser, route } from '@/lib/api';
import { auditIntegrity } from '@/services/admin';

export const runtime = 'nodejs';

export const GET = route(async () => ok(await auditIntegrity(await requireUser())));
