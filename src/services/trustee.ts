import { randomUUID } from 'node:crypto';
import { TrusteeDecisionType } from '@prisma/client';
import { getBudgetTiles, recomputeBudget } from '@/lib/budget';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { generateAwardLetter } from '@/lib/pdf';
import { storage } from '@/lib/storage';
import type { AuthUser } from '@/lib/auth/session';
import { performTransition } from './workflow-service';

const STATUS_FOR_DECISION = {
  APPROVE: 'TRUSTEE_APPROVED',
  WAITLIST: 'TRUSTEE_WAITLISTED',
  DECLINE: 'TRUSTEE_DECLINED',
} as const;

export async function getTrusteeQueue() {
  return prisma.application.findMany({
    where: { status: { in: ['RECOMMENDED', 'NOT_RECOMMENDED', 'TRUSTEE_WAITLISTED'] } },
    include: {
      child: true,
      guardian: { select: { fullName: true } },
      scores: { select: { weightedTotal: true, recommendation: true } },
      trusteeDecision: true,
    },
    orderBy: { decisionAt: 'asc' },
  });
}

export async function decide(
  user: AuthUser,
  id: string,
  input: {
    decision: TrusteeDecisionType;
    approvedAmount?: number;
    notes?: string;
    batchId?: string;
  },
) {
  assertCan(user.role, PERMISSIONS.TRUSTEE_DECIDE);
  const application = await prisma.application.findUnique({
    where: { id },
    include: { child: true, guardian: true },
  });
  if (!application) throw new NotFoundError('Application not found');

  let letterKey: string | undefined;
  if (input.decision === TrusteeDecisionType.APPROVE) {
    const pdf = await generateAwardLetter({
      referenceNo: application.referenceNo,
      guardianName: application.guardian.fullName,
      childName: application.child.fullName,
      school: application.child.school,
      amount: input.approvedAmount ?? 0,
    });
    letterKey = `awards/${id}/${randomUUID()}.pdf`;
    await storage.put(letterKey, pdf, 'application/pdf');
  }

  const result = await performTransition({
    user,
    applicationId: id,
    to: STATUS_FOR_DECISION[input.decision],
    payload: { decision: input.decision, approvedAmount: input.approvedAmount },
    reason: input.notes,
    sideEffects: async (tx, app, now) => {
      await tx.trusteeDecision.upsert({
        where: { applicationId: id },
        update: {
          trusteeId: user.id,
          decision: input.decision,
          approvedAmount: input.approvedAmount,
          notes: input.notes,
          batchId: input.batchId ?? null,
          decidedAt: now,
        },
        create: {
          applicationId: id,
          trusteeId: user.id,
          decision: input.decision,
          approvedAmount: input.approvedAmount,
          notes: input.notes,
          batchId: input.batchId ?? null,
        },
      });
      if (letterKey && input.approvedAmount) {
        await tx.award.upsert({
          where: { applicationId: id },
          update: {
            amount: input.approvedAmount,
            letterKey,
            letterGeneratedAt: now,
            status: 'OFFERED',
          },
          create: {
            applicationId: id,
            amount: input.approvedAmount,
            letterKey,
            letterGeneratedAt: now,
            validUntil: new Date(now.getTime() + 30 * 86_400_000),
          },
        });
      }
    },
  });

  if (input.decision === TrusteeDecisionType.APPROVE) {
    await recomputeBudget(new Date().getFullYear(), application.stream);
  }
  return result;
}

export async function batchDecide(
  user: AuthUser,
  input: { applicationIds: string[]; decision: TrusteeDecisionType; approvedAmount?: number; notes?: string },
) {
  const batchId = randomUUID();
  const settled = await Promise.allSettled(
    input.applicationIds.map((id) =>
      decide(user, id, { ...input, batchId }),
    ),
  );
  return {
    batchId,
    succeeded: settled.filter((item) => item.status === 'fulfilled').length,
    failed: settled
      .map((item, index) => ({ index, id: input.applicationIds[index], reason: item.status === 'rejected' ? String(item.reason) : '' }))
      .filter((item) => item.reason),
  };
}

export async function budgets(year?: number) {
  return getBudgetTiles(year);
}
