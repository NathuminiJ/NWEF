import { Prisma, type Application, type ApplicationStatus } from '@prisma/client';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, type AuthUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import {
  assertTransition,
  getClockUpdate,
  STATUS_LABELS,
  type TransitionDefinition,
} from '@/lib/workflow';
import { getAccessibleApplication } from './access';

export interface PerformTransitionInput {
  user: AuthUser;
  applicationId: string;
  to: ApplicationStatus;
  payload?: Record<string, unknown>;
  reason?: string;
  /** Atomic side effects (info requests, awards, ledger rows, …). */
  sideEffects?: (
    tx: Prisma.TransactionClient,
    application: Application,
    now: Date,
  ) => Promise<void> | void;
}

export async function performTransition(input: PerformTransitionInput): Promise<{
  application: Application;
  transition: TransitionDefinition;
}> {
  const application = await getAccessibleApplication(input.applicationId, input.user);
  const context = {
    application,
    actorRole: input.user.role,
    payload: input.payload,
  };
  const transition = await assertTransition(context, input.to);
  const now = new Date();
  const clock = getClockUpdate({ ...context, now }, input.to);

  const data: Prisma.ApplicationUpdateInput = {
    status: input.to,
    previousStatus: application.status,
    version: { increment: 1 },
    clockPausedAt: clock.clockPausedAt,
    pausedDurationMs: clock.pausedDurationMs,
    slaDueAt: clock.slaDueAt,
  };
  if (input.to === 'SUBMITTED') data.submittedAt = clock.submittedAt;
  if (input.to === 'SHORTLISTED') data.screeningCompletedAt = now;
  if (input.to.startsWith('TRUSTEE_')) data.decisionAt = now;
  if (input.to === 'AWARD_ACCEPTED') data.awardAcceptedAt = now;

  let updated!: Application;
  await prisma.$transaction(async (tx) => {
    updated = await tx.application.update({ where: { id: application.id }, data });
    await tx.applicationTimelineEvent.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: input.to,
        action: transition.action,
        actorId: input.user.id,
        actorRole: input.user.role,
        reason: input.reason ?? (input.payload?.['reason'] as string | undefined) ?? null,
        metadata: (input.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    await input.sideEffects?.(tx, application, now);
  });

  await writeAudit({
    actorId: input.user.id,
    actorRole: input.user.role,
    action: 'STATUS_CHANGE',
    entityType: 'Application',
    entityId: application.id,
    metadata: {
      from: application.status,
      to: input.to,
      action: transition.action,
      statusLabel: STATUS_LABELS[input.to],
    },
    ...(await getRequestMeta()),
  });

  return { application: updated, transition };
}
