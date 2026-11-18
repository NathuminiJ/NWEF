import { ok, requireUser, route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { getAccessibleApplication } from '@/services/access';
import { STATUS_LABELS } from '@/lib/workflow';

export const runtime = 'nodejs';

export const GET = route(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  await getAccessibleApplication(id, user);
  const events = await prisma.applicationTimelineEvent.findMany({
    where: { applicationId: id },
    include: { actor: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return ok(events.map((event) => ({ ...event, label: STATUS_LABELS[event.toStatus] })));
});
