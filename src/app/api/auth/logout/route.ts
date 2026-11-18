import { cookies } from 'next/headers';
import { ok, route } from '@/lib/api';
import { writeAudit } from '@/lib/audit';
import { config } from '@/lib/config';
import { getCurrentUser, getRequestMeta, revokeSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

export const POST = route(async () => {
  const token = (await cookies()).get(config.cookieName)?.value;
  const user = await getCurrentUser();
  if (user) {
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: user.id,
      ...(await getRequestMeta()),
    });
  }
  await revokeSession(token);
  const response = ok({ signedOut: true });
  response.cookies.delete(config.cookieName);
  return response;
});
