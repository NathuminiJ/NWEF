import type { Application } from '@prisma/client';
import { config } from './config';

export type SlaFlag = 'NOT_STARTED' | 'PAUSED' | 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE';

export interface SlaInfo {
  dueAt: Date | null;
  effectiveDueAt: Date | null;
  remainingMs: number | null;
  flag: SlaFlag;
  paused: boolean;
}

export type SlaApplication = Pick<
  Application,
  'submittedAt' | 'clockPausedAt' | 'pausedDurationMs' | 'slaDueAt'
>;

/** SLA = submission + configured turnaround + all paused time. */
export function computeSlaDueAt(submittedAt: Date | null, pausedDurationMs: number): Date | null {
  if (!submittedAt) return null;
  return new Date(
    submittedAt.getTime() + config.business.screeningTurnaroundDays * 86_400_000 + pausedDurationMs,
  );
}

/**
 * While a request for information is open the stored due date is extended by
 * the current pause so reviewers never see a false overdue flag.
 */
export function getSlaInfo(application: SlaApplication, now = new Date()): SlaInfo {
  const paused = Boolean(application.clockPausedAt);
  const baseDueAt = application.slaDueAt ?? computeSlaDueAt(application.submittedAt, application.pausedDurationMs);
  if (!baseDueAt || !application.submittedAt) {
    return { dueAt: baseDueAt, effectiveDueAt: baseDueAt, remainingMs: null, flag: 'NOT_STARTED', paused };
  }

  const ongoingPauseMs = paused ? Math.max(0, now.getTime() - application.clockPausedAt!.getTime()) : 0;
  // baseDueAt already includes completed pauses; add only the live pause interval.
  const effectiveDueAt = new Date(baseDueAt.getTime() + ongoingPauseMs);
  const remainingMs = effectiveDueAt.getTime() - now.getTime();

  if (paused) return { dueAt: baseDueAt, effectiveDueAt, remainingMs, flag: 'PAUSED', paused };
  if (remainingMs < 0) return { dueAt: baseDueAt, effectiveDueAt, remainingMs, flag: 'OVERDUE', paused };
  if (remainingMs <= config.business.slaWarningDays * 86_400_000) {
    return { dueAt: baseDueAt, effectiveDueAt, remainingMs, flag: 'DUE_SOON', paused };
  }
  return { dueAt: baseDueAt, effectiveDueAt, remainingMs, flag: 'ON_TRACK', paused };
}

/** Human-readable turnaround descriptor used by queue tiles and flags. */
export function slaLabel(flag: SlaFlag): string {
  return {
    NOT_STARTED: 'Not started',
    PAUSED: 'Clock paused — info requested',
    ON_TRACK: 'On track',
    DUE_SOON: 'Due soon',
    OVERDUE: 'Overdue',
  }[flag];
}
