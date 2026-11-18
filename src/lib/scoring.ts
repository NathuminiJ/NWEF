import type { Stream } from '@prisma/client';
import { SCORE_CRITERIA } from './constants';
import { BadRequestError } from './errors';

export interface CriterionScore {
  key: string;
  score: number;
  comment?: string;
}

function criteriaFor(stream: Stream) {
  return SCORE_CRITERIA.filter((criterion) => (stream === 'OLD_TINITIAN_SUPPORT' ? criterion.weightA : criterion.weightB) > 0);
}

/** Each panel member submits one independent, complete rubric. */
export function validateScores(stream: Stream, scores: CriterionScore[]): void {
  if (!Array.isArray(scores) || scores.length === 0) throw new BadRequestError('Scores are required');
  const required = criteriaFor(stream);
  const byKey = new Map(scores.map((item) => [item.key, item]));
  for (const criterion of required) {
    const item = byKey.get(criterion.key);
    if (!item) throw new BadRequestError(`Missing score for ${criterion.label}`);
    if (!Number.isInteger(item.score) || item.score < 1 || item.score > 5) {
      throw new BadRequestError(`${criterion.label} must be an integer from 1 to 5`);
    }
  }
  const allowedKeys = new Set(required.map((criterion) => criterion.key));
  if (scores.some((item) => !allowedKeys.has(item.key))) {
    throw new BadRequestError('Scores contain an unknown criterion for this stream');
  }
}

/** Weighted score on a 1–5 scale, rounded to two decimal places. */
export function weightedScore(stream: Stream, scores: CriterionScore[]): number {
  validateScores(stream, scores);
  const byKey = new Map(scores.map((item) => [item.key, item.score]));
  const total = criteriaFor(stream).reduce((sum, criterion) => {
    const weight = stream === 'OLD_TINITIAN_SUPPORT' ? criterion.weightA : criterion.weightB;
    return sum + (byKey.get(criterion.key) ?? 0) * weight;
  }, 0);
  return Math.round(total * 100) / 100;
}

export function averagePanelScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
}
