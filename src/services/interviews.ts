import { Prisma } from '@prisma/client';
import { config } from '@/lib/config';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, type AuthUser } from '@/lib/auth/session';
import { BadRequestError, ConflictError } from '@/lib/errors';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { averagePanelScore, validateScores, weightedScore, type CriterionScore } from '@/lib/scoring';
import { prisma } from '@/lib/db';
import { getAccessibleApplication } from './access';
import { performTransition } from './workflow-service';

export async function listInterviewSessions() {
  return prisma.interviewSession.findMany({
    include: {
      slots: {
        include: { bookings: { where: { status: { not: 'CANCELLED' } }, select: { id: true } } },
        orderBy: { startsAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createInterviewSession(
  user: AuthUser,
  input: {
    title: string;
    location?: string;
    mode: 'IN_PERSON' | 'ONLINE' | 'HYBRID';
    slots: Array<{ startsAt: Date; endsAt: Date; capacity: number }>;
  },
) {
  assertCan(user.role, PERMISSIONS.INTERVIEW_MANAGE);
  if (input.slots.some((slot) => slot.endsAt.getTime() <= slot.startsAt.getTime())) {
    throw new BadRequestError('Each slot must end after it starts');
  }
  const session = await prisma.interviewSession.create({
    data: {
      title: input.title,
      location: input.location,
      mode: input.mode,
      createdById: user.id,
      slots: { create: input.slots },
    },
  });
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'CREATE',
    entityType: 'InterviewSession',
    entityId: session.id,
    ...(await getRequestMeta()),
  });
  return session;
}

export async function markInterviewAttended(user: AuthUser, id: string) {
  return performTransition({
    user,
    applicationId: id,
    to: 'INTERVIEWED',
    payload: { attended: true },
    sideEffects: async (tx, application) => {
      const booking = await tx.interviewBooking.findUnique({ where: { applicationId: application.id } });
      if (!booking) throw new BadRequestError('No interview booking exists for this application');
      await tx.interviewBooking.update({
        where: { id: booking.id },
        data: { status: 'ATTENDED', checkedInAt: new Date() },
      });
    },
  });
}

export async function submitScore(
  user: AuthUser,
  id: string,
  input: { criteria: CriterionScore[]; recommendation: 'RECOMMENDED' | 'NOT_RECOMMENDED'; comments?: string },
) {
  assertCan(user.role, PERMISSIONS.SCORE_SUBMIT);
  const application = await getAccessibleApplication(id, user);
  validateScores(application.stream, input.criteria);
  const total = weightedScore(application.stream, input.criteria);

  await prisma.score.upsert({
    where: { applicationId_panelMemberId: { applicationId: id, panelMemberId: user.id } },
    update: {
      criteria: input.criteria as unknown as Prisma.InputJsonValue,
      weightedTotal: total,
      recommendation: input.recommendation,
      comments: input.comments,
      submittedAt: new Date(),
    },
    create: {
      applicationId: id,
      panelMemberId: user.id,
      criteria: input.criteria as unknown as Prisma.InputJsonValue,
      weightedTotal: total,
      recommendation: input.recommendation,
      comments: input.comments,
    },
  });
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'SCORE_SUBMITTED',
    entityType: 'Application',
    entityId: id,
    metadata: { weightedTotal: total, recommendation: input.recommendation },
    ...(await getRequestMeta()),
  });

  const all = await prisma.score.findMany({ where: { applicationId: id }, select: { weightedTotal: true } });
  const average = averagePanelScore(all.map((score) => Number(score.weightedTotal)));
  if (input.recommendation === 'RECOMMENDED' && average < config.business.minRecommendationScore) {
    throw new ConflictError('Average panel score is below the recommendation threshold');
  }
  return performTransition({
    user,
    applicationId: id,
    to: input.recommendation === 'RECOMMENDED' ? 'RECOMMENDED' : 'NOT_RECOMMENDED',
    payload: { scoresSubmitted: true, averageScore: average },
    reason: input.comments,
  });
}

export function getScores(id: string) {
  return prisma.score.findMany({
    where: { applicationId: id },
    include: { panelMember: { select: { fullName: true, role: true } } },
    orderBy: { submittedAt: 'asc' },
  });
}
