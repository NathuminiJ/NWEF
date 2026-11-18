import { ok, route } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

export const GET = route(async () => ok({ user: await getCurrentUser() }));
