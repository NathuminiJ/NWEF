import { Prisma, ScreeningOutcome } from '@prisma/client';
import { SCREENING_CHECKLIST } from '@/lib/constants';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { BadRequestError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { getSlaInfo } from '@/lib/sla';
import type { AuthUser } from '@/lib/auth/session';
import { getAccessibleApplication } from './access';
import { performTransition } from './workflow-service';
import { requestInfo } from './applications';

export async function getScreeningQueue(user: AuthUser) {
  assertCan(user.role, PERMISSIONS.SCREENING_REVIEW);
  const applications = await prisma.application.findMany({
    where: { status: { in: ['SUBMITTED', 'UNDER_SCREENING'] } },
    include: { child: true, guardian: { select: { fullName: true } }, streamA: true, streamB: true },
    orderBy: { slaDueAt: 'asc' },
  });
  return applications.map((application) => ({
    ...application,
    sla: getSlaInfo(application),
  }));
}

export async function submitScreeningReview(
  user: AuthUser,
  id: string,
  input: {
    checklist: Array<{ key: string; passed: boolean; notes?: string }>;
    outcome: ScreeningOutcome;
    notes?: string;
  },
) {
  assertCan(user.role, PERMISSIONS.SCREENING_REVIEW);
  let application = await getAccessibleApplication(id, user);
  // Opening a submitted application for review moves it into screening first.
  if (application.status === 'SUBMITTED') {
    await performTransition({ user, applicationId: id, to: 'UNDER_SCREENING' });
    application = await getAccessibleApplication(id, user);
  }
  const requiredKeys = SCREENING_CHECKLIST.filter((item) => item.requiredFor.includes(application.stream)).map(
    (item) => item.key,
  );
  const submittedKeys = new Set(input.checklist.map((item) => item.key));
  const missing = requiredKeys.filter((key) => !submittedKeys.has(key));
  if (missing.length > 0) throw new BadRequestError(`Missing checklist items: ${missing.join(', ')}`);

  if (input.outcome === ScreeningOutcome.INFO_REQUESTED) {
    await prisma.screeningReview.create({
      data: {
        applicationId: id,
        reviewerId: user.id,
        checklist: input.checklist as unknown as Prisma.InputJsonValue,
        outcome: input.outcome,
        notes: input.notes,
      },
    });
    return requestInfo(user, id, input.notes ?? 'Additional information required for screening');
  }

  const to = input.outcome === ScreeningOutcome.ELIGIBLE ? 'SHORTLISTED' : 'NOT_ELIGIBLE';
  return performTransition({
    user,
    applicationId: id,
    to,
    payload: { screeningOutcome: input.outcome },
    reason: input.notes,
    sideEffects: async (tx) => {
      await tx.screeningReview.create({
        data: {
          applicationId: id,
          reviewerId: user.id,
          checklist: input.checklist as unknown as Prisma.InputJsonValue,
          outcome: input.outcome,
          notes: input.notes,
        },
      });
    },
  });
}
