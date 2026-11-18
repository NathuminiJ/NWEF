'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field } from '@/components/ui';
import { postJson } from '@/lib/client';
import { SCORE_CRITERIA } from '@/lib/constants';
import type { Stream } from '@prisma/client';

export function ScoreCard({ applicationId, stream }: { applicationId: string; stream: Stream }) {
  const criteria = SCORE_CRITERIA.filter((item) =>
    stream === 'OLD_TINITIAN_SUPPORT' ? item.weightA > 0 : item.weightB > 0,
  );
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(criteria.map((item) => [item.key, 3])),
  );
  const [recommendation, setRecommendation] = useState('RECOMMENDED');
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/applications/${applicationId}/scores`, {
        criteria: criteria.map((item) => ({ key: item.key, score: scores[item.key] ?? 3 })),
        recommendation,
        comments,
      });
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card title="Independent panel scorecard" description="Scores are private to each panel member and weighted by stream.">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        {criteria.map((item) => (
          <Field
            key={item.key}
            label={`${item.label} (weight ${stream === 'OLD_TINITIAN_SUPPORT' ? item.weightA : item.weightB})`}
          >
            <select
              className="input"
              value={scores[item.key]}
              onChange={(event) => setScores((current) => ({ ...current, [item.key]: Number(event.target.value) }))}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </Field>
        ))}
        <Field label="Recommendation">
          <select className="input" value={recommendation} onChange={(event) => setRecommendation(event.target.value)}>
            <option value="RECOMMENDED">Recommended</option>
            <option value="NOT_RECOMMENDED">Not recommended</option>
          </select>
        </Field>
        <Field label="Comments">
          <textarea className="input min-h-24" value={comments} onChange={(event) => setComments(event.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit scorecard'}</Button>
      </form>
    </Card>
  );
}
