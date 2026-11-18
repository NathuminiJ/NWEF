import { describe, expect, it } from 'vitest';
import { assertTransition, getClockUpdate, type WorkflowApplication } from '@/lib/workflow';
import { AppError } from '@/lib/errors';

const base: WorkflowApplication = {
  status: 'DRAFT',
  stream: 'OLD_TINITIAN_SUPPORT',
  submittedAt: null,
  clockPausedAt: null,
  pausedDurationMs: 0,
  slaDueAt: null,
};

describe('workflow state machine', () => {
  it('requires submission confirmations', async () => {
    await expect(assertTransition({ application: base, actorRole: 'APPLICANT' }, 'SUBMITTED')).rejects.toBeInstanceOf(
      AppError,
    );
    const result = await assertTransition(
      {
        application: base,
        actorRole: 'APPLICANT',
        payload: { detailsComplete: true, documentsComplete: true, consentGranted: true },
      },
      'SUBMITTED',
    );
    expect(result.action).toBe('SUBMIT');
  });

  it('enforces role boundaries on transitions', async () => {
    await expect(
      assertTransition({ application: { ...base, status: 'SUBMITTED' }, actorRole: 'APPLICANT' }, 'UNDER_SCREENING'),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('pauses the SLA clock on info request and resumes it with elapsed time', () => {
    const submittedAt = new Date('2026-01-01T00:00:00.000Z');
    const pauseStart = new Date('2026-01-03T00:00:00.000Z');
    const resumeAt = new Date('2026-01-05T00:00:00.000Z');
    const paused = getClockUpdate(
      {
        application: { ...base, status: 'UNDER_SCREENING', submittedAt },
        actorRole: 'ADMIN_OFFICER',
        now: pauseStart,
      },
      'INFO_REQUESTED',
    );
    expect(paused.clockPausedAt).toEqual(pauseStart);
    expect(paused.slaDueAt?.toISOString()).toBe('2026-01-11T00:00:00.000Z');

    const resumed = getClockUpdate(
      {
        application: { ...base, status: 'INFO_REQUESTED', submittedAt, clockPausedAt: pauseStart },
        actorRole: 'APPLICANT',
        now: resumeAt,
      },
      'UNDER_SCREENING',
    );
    expect(resumed.pausedDurationMs).toBe(2 * 86_400_000);
    expect(resumed.clockPausedAt).toBeNull();
    expect(resumed.slaDueAt?.toISOString()).toBe('2026-01-13T00:00:00.000Z');
  });

  it('requires an approved amount for trustee approval', async () => {
    const application = { ...base, status: 'RECOMMENDED' as const };
    await expect(
      assertTransition(
        { application, actorRole: 'TRUSTEE', payload: { decision: 'APPROVE' } },
        'TRUSTEE_APPROVED',
      ),
    ).rejects.toBeInstanceOf(AppError);
    const result = await assertTransition(
      { application, actorRole: 'TRUSTEE', payload: { decision: 'APPROVE', approvedAmount: 150000 } },
      'TRUSTEE_APPROVED',
    );
    expect(result.action).toBe('TRUSTEE_APPROVE');
  });
});
