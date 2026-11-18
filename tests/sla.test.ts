import { describe, expect, it } from 'vitest';
import { computeSlaDueAt, getSlaInfo } from '@/lib/sla';

const submittedAt = new Date('2026-02-01T00:00:00.000Z');

describe('10-day screening SLA', () => {
  it('adds the configured turnaround to submission', () => {
    expect(computeSlaDueAt(submittedAt, 0)?.toISOString()).toBe('2026-02-11T00:00:00.000Z');
  });

  it('adds previously paused time and flags a live pause', () => {
    const pausedAt = new Date('2026-02-03T00:00:00.000Z');
    const now = new Date('2026-02-04T00:00:00.000Z');
    const info = getSlaInfo(
      { submittedAt, clockPausedAt: pausedAt, pausedDurationMs: 0, slaDueAt: computeSlaDueAt(submittedAt, 0) },
      now,
    );
    expect(info.flag).toBe('PAUSED');
    expect(info.effectiveDueAt?.toISOString()).toBe('2026-02-12T00:00:00.000Z');
  });

  it('flags overdue applications', () => {
    const info = getSlaInfo(
      { submittedAt, clockPausedAt: null, pausedDurationMs: 0, slaDueAt: computeSlaDueAt(submittedAt, 0) },
      new Date('2026-02-12T00:00:00.000Z'),
    );
    expect(info.flag).toBe('OVERDUE');
  });
});
