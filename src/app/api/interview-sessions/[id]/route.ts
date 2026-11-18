import { ok, requireUser, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

export const GET = route(async (_request, context) => {
  await requireUser();
  const { id } = await context.params;
  const session = await prisma.interviewSession.findUnique({
    where: { id },
    include: { slots: { include: { bookings: true }, orderBy: { startsAt: 'asc' } } },
  });
  if (!session) throw new NotFoundError('Interview session not found');
  return ok(session);
});
