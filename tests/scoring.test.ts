import { describe, expect, it } from 'vitest';
import { validateScores, weightedScore, averagePanelScore } from '@/lib/scoring';

describe('weighted panel scoring', () => {
  it('uses circumstances/academic/conduct weights for Stream A', () => {
    const scores = [
      { key: 'need', score: 5 },
      { key: 'academic', score: 4 },
      { key: 'conduct', score: 3 },
    ];
    expect(weightedScore('OLD_TINITIAN_SUPPORT', scores)).toBe(4.15);
  });

  it('uses sport and coach weights for Stream B', () => {
    const scores = [
      { key: 'need', score: 3 },
      { key: 'academic', score: 3 },
      { key: 'sport', score: 5 },
      { key: 'coach', score: 4 },
      { key: 'conduct', score: 4 },
    ];
    expect(weightedScore('SPORTS_SCHOLARSHIP', scores)).toBe(4.0);
  });

  it('rejects incomplete or out-of-range rubrics', () => {
    expect(() => validateScores('SPORTS_SCHOLARSHIP', [{ key: 'sport', score: 5 }])).toThrow();
    expect(() =>
      validateScores('OLD_TINITIAN_SUPPORT', [
        { key: 'need', score: 6 },
        { key: 'academic', score: 4 },
        { key: 'conduct', score: 3 },
      ]),
    ).toThrow();
  });

  it('averages independent panel members', () => {
    expect(averagePanelScore([4.15, 3.65])).toBe(3.9);
  });
});
