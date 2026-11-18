import type { Role } from '@prisma/client';
import { ForbiddenError } from './errors';

export const PERMISSIONS = {
  APPLICATION_CREATE: 'application:create',
  APPLICATION_READ_OWN: 'application:read:own',
  APPLICATION_UPDATE_OWN: 'application:update:own',
  APPLICATION_SUBMIT_OWN: 'application:submit:own',
  APPLICATION_READ_ALL: 'application:read:all',
  APPLICATION_READ_ASSIGNED: 'application:read:assigned',
  APPLICATION_TRANSITION: 'application:transition',
  APPLICATION_BOOK_INTERVIEW_OWN: 'application:book-interview:own',
  APPLICATION_ACCEPT_AWARD_OWN: 'application:accept-award:own',
  APPLICATION_REQUEST_INFO: 'application:request-info',
  SCREENING_REVIEW: 'screening:review',
  INTERVIEW_MANAGE: 'interview:manage',
  INTERVIEW_ATTEND: 'interview:attend',
  SCORE_SUBMIT: 'score:submit',
  SCORE_READ: 'score:read',
  TRUSTEE_DECIDE: 'trustee:decide',
  TRUSTEE_BUDGET_READ: 'trustee:budget:read',
  FINANCE_MANAGE: 'finance:manage',
  FINANCE_LEDGER_READ: 'finance:ledger:read',
  AWARD_GENERATE: 'award:generate',
  AUDIT_READ: 'audit:read',
  USER_MANAGE: 'user:manage',
  PDPA_MANAGE: 'pdpa:manage',
  REPORTS_READ: 'reports:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const allPermissions = Object.values(PERMISSIONS) as Permission[];

const applicant: Permission[] = [
  PERMISSIONS.APPLICATION_CREATE,
  PERMISSIONS.APPLICATION_READ_OWN,
  PERMISSIONS.APPLICATION_UPDATE_OWN,
  PERMISSIONS.APPLICATION_SUBMIT_OWN,
  PERMISSIONS.APPLICATION_BOOK_INTERVIEW_OWN,
  PERMISSIONS.APPLICATION_ACCEPT_AWARD_OWN,
];

const adminOfficer: Permission[] = [
  PERMISSIONS.APPLICATION_READ_ALL,
  PERMISSIONS.APPLICATION_READ_ASSIGNED,
  PERMISSIONS.APPLICATION_TRANSITION,
  PERMISSIONS.APPLICATION_REQUEST_INFO,
  PERMISSIONS.SCREENING_REVIEW,
  PERMISSIONS.INTERVIEW_MANAGE,
  PERMISSIONS.SCORE_READ,
  PERMISSIONS.AWARD_GENERATE,
  PERMISSIONS.TRUSTEE_BUDGET_READ,
  PERMISSIONS.FINANCE_LEDGER_READ,
  PERMISSIONS.REPORTS_READ,
];

const screeningReviewer: Permission[] = [
  PERMISSIONS.APPLICATION_READ_ASSIGNED,
  PERMISSIONS.APPLICATION_TRANSITION,
  PERMISSIONS.APPLICATION_REQUEST_INFO,
  PERMISSIONS.SCREENING_REVIEW,
  PERMISSIONS.SCORE_READ,
  PERMISSIONS.REPORTS_READ,
];

const interviewPanel: Permission[] = [
  PERMISSIONS.APPLICATION_READ_ASSIGNED,
  PERMISSIONS.APPLICATION_TRANSITION,
  PERMISSIONS.INTERVIEW_ATTEND,
  PERMISSIONS.SCORE_SUBMIT,
  PERMISSIONS.SCORE_READ,
];

const trustee: Permission[] = [
  PERMISSIONS.APPLICATION_READ_ALL,
  PERMISSIONS.APPLICATION_TRANSITION,
  PERMISSIONS.TRUSTEE_DECIDE,
  PERMISSIONS.TRUSTEE_BUDGET_READ,
  PERMISSIONS.SCORE_READ,
  PERMISSIONS.REPORTS_READ,
];

const financeOfficer: Permission[] = [
  PERMISSIONS.APPLICATION_READ_ASSIGNED,
  PERMISSIONS.APPLICATION_TRANSITION,
  PERMISSIONS.FINANCE_MANAGE,
  PERMISSIONS.FINANCE_LEDGER_READ,
  PERMISSIONS.TRUSTEE_BUDGET_READ,
  PERMISSIONS.AWARD_GENERATE,
  PERMISSIONS.REPORTS_READ,
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  APPLICANT: new Set(applicant),
  ADMIN_OFFICER: new Set(adminOfficer),
  SCREENING_REVIEWER: new Set(screeningReviewer),
  INTERVIEW_PANEL: new Set(interviewPanel),
  TRUSTEE: new Set(trustee),
  FINANCE_OFFICER: new Set(financeOfficer),
  SUPER_ADMIN: new Set(allPermissions),
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(`Role ${role} cannot ${permission}`);
}

export function isStaff(role: Role): boolean {
  return role !== 'APPLICANT';
}

export function canReadAllApplications(role: Role): boolean {
  return can(role, PERMISSIONS.APPLICATION_READ_ALL);
}

export function dashboardForRole(role: Role): string {
  switch (role) {
    case 'APPLICANT':
      return '/applications';
    case 'ADMIN_OFFICER':
      return '/admin';
    case 'SCREENING_REVIEWER':
      return '/screening';
    case 'INTERVIEW_PANEL':
      return '/panel';
    case 'TRUSTEE':
      return '/trustee';
    case 'FINANCE_OFFICER':
      return '/finance';
    case 'SUPER_ADMIN':
      return '/super-admin';
  }
}
