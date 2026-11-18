import type { Role } from '@prisma/client';
import { verifyAuditChain, writeAudit } from '@/lib/audit';
import { getRequestMeta, type AuthUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { getSlaInfo, slaLabel } from '@/lib/sla';

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, fullName: true, phone: true, email: true, role: true, isActive: true, lastLoginAt: true },
    orderBy: { role: 'asc' },
  });
}

export async function updateUserRole(actor: AuthUser, userId: string, input: { role: Role; isActive?: boolean }) {
  assertCan(actor.role, PERMISSIONS.USER_MANAGE);
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw new NotFoundError('User not found');
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  // Changing role or disabling an account invalidates all live sessions.
  if (before.role !== input.role || input.isActive === false) {
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'UPDATE',
    entityType: 'User',
    entityId: userId,
    metadata: { fromRole: before.role, toRole: user.role, isActive: user.isActive },
    ...(await getRequestMeta()),
  });
  return user;
}

export async function getAuditLogs(
  user: AuthUser,
  filters: { entityType?: string; entityId?: string; action?: string; take?: number } = {},
) {
  assertCan(user.role, PERMISSIONS.AUDIT_READ);
  return prisma.auditLog.findMany({
    where: {
      entityType: filters.entityType,
      entityId: filters.entityId,
      ...(filters.action ? { action: filters.action as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(filters.take ?? 100, 500),
    include: { actor: { select: { fullName: true, role: true } } },
  });
}

export async function auditIntegrity(user: AuthUser) {
  assertCan(user.role, PERMISSIONS.AUDIT_READ);
  return verifyAuditChain();
}

export async function listDataRequests(user: AuthUser) {
  assertCan(user.role, PERMISSIONS.PDPA_MANAGE);
  return prisma.dataSubjectRequest.findMany({
    include: { user: { select: { fullName: true, phone: true } } },
    orderBy: { dueAt: 'asc' },
  });
}

export async function resolveDataRequest(
  actor: AuthUser,
  id: string,
  resolution: string,
  status: 'COMPLETED' | 'REJECTED' = 'COMPLETED',
) {
  assertCan(actor.role, PERMISSIONS.PDPA_MANAGE);
  const request = await prisma.dataSubjectRequest.update({
    where: { id },
    data: { status, resolution, completedAt: new Date(), handledById: actor.id },
  });
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'DATA_REQUEST_RESOLVED',
    entityType: 'DataSubjectRequest',
    entityId: id,
    metadata: { status },
    ...(await getRequestMeta()),
  });
  return request;
}

export async function slaReport(user: AuthUser) {
  assertCan(user.role, PERMISSIONS.REPORTS_READ);
  const applications = await prisma.application.findMany({
    where: { status: { in: ['SUBMITTED', 'UNDER_SCREENING', 'INFO_REQUESTED'] } },
    select: {
      id: true,
      referenceNo: true,
      submittedAt: true,
      clockPausedAt: true,
      pausedDurationMs: true,
      slaDueAt: true,
      status: true,
    },
  });
  return applications.map((application) => {
    const sla = getSlaInfo(application);
    return { ...application, sla, label: slaLabel(sla.flag) };
  });
}
