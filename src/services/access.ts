import type { Application } from '@prisma/client';
import { PERMISSIONS, can } from '@/lib/rbac';
import type { AuthUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { auditDenied } from '@/lib/api';

const SCREENING_STATUSES: Application['status'][] = [
  'UNDER_SCREENING',
  'INFO_REQUESTED',
  'SHORTLISTED',
  'NOT_ELIGIBLE',
];
const PANEL_STATUSES: Application['status'][] = [
  'SHORTLISTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEWED',
  'RECOMMENDED',
  'NOT_RECOMMENDED',
];
const FINANCE_STATUSES: Application['status'][] = [
  'TRUSTEE_APPROVED',
  'AWARD_ACCEPTED',
  'ACTIVE_AWARD',
  'ANNUAL_RENEWAL',
];

export function canAccessApplication(
  application: Pick<Application, 'guardianId' | 'status'>,
  user: AuthUser,
): boolean {
  if (user.role === 'APPLICANT') return application.guardianId === user.id;
  if (can(user.role, PERMISSIONS.APPLICATION_READ_ALL)) return true;

  switch (user.role) {
    case 'SCREENING_REVIEWER':
      return SCREENING_STATUSES.includes(application.status);
    case 'INTERVIEW_PANEL':
      return PANEL_STATUSES.includes(application.status);
    case 'FINANCE_OFFICER':
      return FINANCE_STATUSES.includes(application.status);
    default:
      return can(user.role, PERMISSIONS.APPLICATION_READ_ASSIGNED);
  }
}

export async function getAccessibleApplication(id: string, user: AuthUser) {
  const application = await prisma.application.findUnique({
    where: { id },
    include: { child: true, streamA: true, streamB: true },
  });
  if (!application) throw new NotFoundError('Application not found');
  if (!canAccessApplication(application, user)) {
    await auditDenied(user, PERMISSIONS.APPLICATION_READ_ASSIGNED, 'Application', id);
  }
  return application;
}

export async function auditView(user: AuthUser, applicationId: string) {
  const { writeAudit } = await import('@/lib/audit');
  const { getRequestMeta } = await import('@/lib/auth/session');
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'VIEW',
    entityType: 'Application',
    entityId: applicationId,
    ...(await getRequestMeta()),
  });
}
