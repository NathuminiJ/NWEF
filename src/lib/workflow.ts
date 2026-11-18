import type { Application, ApplicationStatus, Role } from '@prisma/client';
import { config } from './config';
import { BadRequestError, ForbiddenError } from './errors';
import { computeSlaDueAt } from './sla';

export type WorkflowApplication = Pick<
  Application,
  'status' | 'stream' | 'submittedAt' | 'clockPausedAt' | 'pausedDurationMs' | 'slaDueAt'
>;

export interface TransitionContext {
  application: WorkflowApplication;
  actorRole: Role;
  payload?: Record<string, unknown>;
  now?: Date;
}

export interface TransitionDefinition {
  action: string;
  description: string;
  from: ApplicationStatus[];
  to: ApplicationStatus;
  roles: Role[];
  guard?: (ctx: TransitionContext) => void | Promise<void>;
}

const STAFF: Role[] = ['ADMIN_OFFICER', 'SUPER_ADMIN'];
const SCREENERS: Role[] = ['ADMIN_OFFICER', 'SCREENING_REVIEWER', 'SUPER_ADMIN'];
const PANEL: Role[] = ['INTERVIEW_PANEL', 'SUPER_ADMIN'];
const TRUSTEES: Role[] = ['TRUSTEE', 'SUPER_ADMIN'];
const FINANCE: Role[] = ['FINANCE_OFFICER', 'SUPER_ADMIN'];

function requireString(payload: Record<string, unknown> | undefined, field: string): string {
  const value = payload?.[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestError(`${field} is required for this transition`);
  }
  return value;
}

function requireTrue(payload: Record<string, unknown> | undefined, field: string): void {
  if (payload?.[field] !== true) {
    throw new BadRequestError(`${field} must be confirmed for this transition`);
  }
}

function requireEnum<T extends string>(
  payload: Record<string, unknown> | undefined,
  field: string,
  allowed: readonly T[],
): T {
  const value = payload?.[field];
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new BadRequestError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

/**
 * Single source of truth for the NWEF pipeline. Every status change must pass
 * through assertTransition; side effects (emails, PDFs, ledger rows) live in
 * the application service, never in this pure state machine.
 */
export const WORKFLOW_TRANSITIONS: TransitionDefinition[] = [
  {
    action: 'SUBMIT',
    description: 'Applicant completes and submits the application',
    from: ['DRAFT'],
    to: 'SUBMITTED',
    roles: ['APPLICANT'],
    guard: (ctx) => {
      requireTrue(ctx.payload, 'detailsComplete');
      requireTrue(ctx.payload, 'documentsComplete');
      requireTrue(ctx.payload, 'consentGranted');
    },
  },
  {
    action: 'START_SCREENING',
    description: 'Admin Officer opens the application for screening',
    from: ['SUBMITTED'],
    to: 'UNDER_SCREENING',
    roles: STAFF,
  },
  {
    action: 'REQUEST_INFO',
    description: 'Reviewer requests information — SLA clock pauses',
    from: ['UNDER_SCREENING'],
    to: 'INFO_REQUESTED',
    roles: SCREENERS,
    guard: (ctx) => {
      requireString(ctx.payload, 'message');
    },
  },
  {
    action: 'SUBMIT_INFO',
    description: 'Applicant supplies requested information — SLA clock resumes',
    from: ['INFO_REQUESTED'],
    to: 'UNDER_SCREENING',
    roles: ['APPLICANT', ...STAFF],
    guard: (ctx) => {
      requireString(ctx.payload, 'response');
    },
  },
  {
    action: 'SHORTLIST',
    description: 'Screening outcome: eligible for interview',
    from: ['UNDER_SCREENING'],
    to: 'SHORTLISTED',
    roles: SCREENERS,
    guard: (ctx) => {
      requireEnum(ctx.payload, 'screeningOutcome', ['ELIGIBLE'] as const);
    },
  },
  {
    action: 'MARK_NOT_ELIGIBLE',
    description: 'Screening outcome: not eligible',
    from: ['UNDER_SCREENING'],
    to: 'NOT_ELIGIBLE',
    roles: SCREENERS,
    guard: (ctx) => {
      requireEnum(ctx.payload, 'screeningOutcome', ['NOT_ELIGIBLE'] as const);
    },
  },
  {
    action: 'SCHEDULE_INTERVIEW',
    description: 'Interview slot booked',
    from: ['SHORTLISTED'],
    to: 'INTERVIEW_SCHEDULED',
    roles: STAFF,
    guard: (ctx) => {
      requireString(ctx.payload, 'bookingId');
    },
  },
  {
    action: 'MARK_INTERVIEWED',
    description: 'Interview session completed',
    from: ['INTERVIEW_SCHEDULED'],
    to: 'INTERVIEWED',
    roles: ['ADMIN_OFFICER', ...PANEL],
    guard: (ctx) => {
      requireTrue(ctx.payload, 'attended');
    },
  },
  {
    action: 'RECOMMEND',
    description: 'Panel recommends an award',
    from: ['INTERVIEWED'],
    to: 'RECOMMENDED',
    roles: PANEL,
    guard: (ctx) => {
      requireTrue(ctx.payload, 'scoresSubmitted');
      const average = Number(ctx.payload?.['averageScore']);
      if (!Number.isFinite(average) || average < config.business.minRecommendationScore) {
        throw new BadRequestError('Weighted panel score is below the recommendation threshold');
      }
    },
  },
  {
    action: 'NOT_RECOMMEND',
    description: 'Panel does not recommend an award',
    from: ['INTERVIEWED'],
    to: 'NOT_RECOMMENDED',
    roles: PANEL,
    guard: (ctx) => {
      requireTrue(ctx.payload, 'scoresSubmitted');
    },
  },
  {
    action: 'TRUSTEE_APPROVE',
    description: 'Trust Board approves an award',
    from: ['RECOMMENDED', 'NOT_RECOMMENDED', 'TRUSTEE_WAITLISTED'],
    to: 'TRUSTEE_APPROVED',
    roles: TRUSTEES,
    guard: (ctx) => {
      requireEnum(ctx.payload, 'decision', ['APPROVE'] as const);
      if (!(Number(ctx.payload?.['approvedAmount']) > 0)) {
        throw new BadRequestError('approvedAmount must be greater than zero');
      }
    },
  },
  {
    action: 'TRUSTEE_WAITLIST',
    description: 'Trust Board places application on waitlist',
    from: ['RECOMMENDED', 'NOT_RECOMMENDED'],
    to: 'TRUSTEE_WAITLISTED',
    roles: TRUSTEES,
    guard: (ctx) => {
      requireEnum(ctx.payload, 'decision', ['WAITLIST'] as const);
    },
  },
  {
    action: 'TRUSTEE_DECLINE',
    description: 'Trust Board declines an award',
    from: ['RECOMMENDED', 'NOT_RECOMMENDED', 'TRUSTEE_WAITLISTED'],
    to: 'TRUSTEE_DECLINED',
    roles: TRUSTEES,
    guard: (ctx) => {
      requireEnum(ctx.payload, 'decision', ['DECLINE'] as const);
    },
  },
  {
    action: 'ACCEPT_AWARD',
    description: 'Applicant signs and accepts the award letter',
    from: ['TRUSTEE_APPROVED'],
    to: 'AWARD_ACCEPTED',
    roles: ['APPLICANT'],
    guard: (ctx) => {
      requireString(ctx.payload, 'signatureName');
      requireTrue(ctx.payload, 'accepted');
    },
  },
  {
    action: 'ACTIVATE_AWARD',
    description: 'Finance activates the award and payment schedule',
    from: ['AWARD_ACCEPTED'],
    to: 'ACTIVE_AWARD',
    roles: FINANCE,
    guard: (ctx) => {
      requireTrue(ctx.payload, 'instalmentsCreated');
    },
  },
  {
    action: 'START_RENEWAL',
    description: 'Annual renewal application opened',
    from: ['ACTIVE_AWARD'],
    to: 'ANNUAL_RENEWAL',
    roles: ['APPLICANT', ...STAFF],
    guard: (ctx) => {
      requireString(ctx.payload, 'renewalApplicationId');
    },
  },
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_SCREENING: 'Under screening',
  INFO_REQUESTED: 'Info requested',
  SHORTLISTED: 'Shortlisted',
  NOT_ELIGIBLE: 'Not eligible',
  INTERVIEW_SCHEDULED: 'Interview scheduled',
  INTERVIEWED: 'Interviewed',
  RECOMMENDED: 'Recommended',
  NOT_RECOMMENDED: 'Not recommended',
  TRUSTEE_APPROVED: 'Trustee approved',
  TRUSTEE_WAITLISTED: 'Waitlisted',
  TRUSTEE_DECLINED: 'Declined',
  AWARD_ACCEPTED: 'Award accepted',
  ACTIVE_AWARD: 'Active award',
  ANNUAL_RENEWAL: 'Annual renewal',
};

const TERMINAL_STATUSES: ApplicationStatus[] = ['NOT_ELIGIBLE', 'TRUSTEE_DECLINED'];

export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export async function assertTransition(ctx: TransitionContext, to: ApplicationStatus): Promise<TransitionDefinition> {
  const candidates = WORKFLOW_TRANSITIONS.filter(
    (transition) => transition.to === to && transition.from.includes(ctx.application.status),
  );
  if (candidates.length === 0) {
    throw new BadRequestError(
      `Cannot move application from ${STATUS_LABELS[ctx.application.status]} to ${STATUS_LABELS[to]}`,
    );
  }
  const transition = candidates[0]!;
  if (!transition.roles.includes(ctx.actorRole)) {
    throw new ForbiddenError(`Role ${ctx.actorRole} cannot perform ${transition.action}`);
  }
  await transition.guard?.(ctx);
  return transition;
}

export function getAvailableTransitions(status: ApplicationStatus, role: Role): TransitionDefinition[] {
  return WORKFLOW_TRANSITIONS.filter(
    (transition) => transition.from.includes(status) && transition.roles.includes(role),
  );
}

/** Returns the persistence values that implement pause/resume of the SLA clock. */
export function getClockUpdate(ctx: TransitionContext, to: ApplicationStatus) {
  const now = ctx.now ?? new Date();
  let clockPausedAt = ctx.application.clockPausedAt;
  let pausedDurationMs = ctx.application.pausedDurationMs;

  if (to === 'INFO_REQUESTED' && !clockPausedAt) {
    clockPausedAt = now;
  } else if (to === 'UNDER_SCREENING' && clockPausedAt) {
    pausedDurationMs += Math.max(0, now.getTime() - clockPausedAt.getTime());
    clockPausedAt = null;
  }

  const submittedAt = ctx.application.submittedAt ?? (to === 'SUBMITTED' ? now : null);
  return {
    clockPausedAt,
    pausedDurationMs,
    slaDueAt: computeSlaDueAt(submittedAt, pausedDurationMs),
    submittedAt: ctx.application.submittedAt ?? (to === 'SUBMITTED' ? now : null),
  };
}
