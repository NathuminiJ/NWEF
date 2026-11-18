'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field } from '@/components/ui';
import { postJson } from '@/lib/client';
import { SCREENING_CHECKLIST } from '@/lib/constants';
import type { Stream } from '@prisma/client';

export function ScreeningChecklist({ applicationId, stream }: { applicationId: string; stream: Stream }) {
  const items = SCREENING_CHECKLIST.filter((item) => item.requiredFor.includes(stream));
  const [checks, setChecks] = useState<Record<string, { passed: boolean; notes: string }>>(
    Object.fromEntries(items.map((item) => [item.key, { passed: true, notes: '' }])),
  );
  const [outcome, setOutcome] = useState('ELIGIBLE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/applications/${applicationId}/screening`, {
        checklist: Object.entries(checks).map(([key, value]) => ({ key, passed: value.passed, notes: value.notes })),
        outcome,
        notes,
      });
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card title="Screening checklist">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        {items.map((item) => (
          <div key={item.key} className="border border-[var(--line)] p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checks[item.key]?.passed ?? false}
                onChange={(event) =>
                  setChecks((current) => ({
                    ...current,
                    [item.key]: { ...current[item.key]!, passed: event.target.checked },
                  }))
                }
              />
              {item.label}
            </label>
            <input
              className="input mt-2"
              placeholder="Reviewer notes (optional)"
              value={checks[item.key]?.notes ?? ''}
              onChange={(event) =>
                setChecks((current) => ({ ...current, [item.key]: { ...current[item.key]!, notes: event.target.value } }))
              }
            />
          </div>
        ))}
        <Field label="Outcome">
          <select className="input" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
            <option value="ELIGIBLE">Eligible — shortlist</option>
            <option value="NOT_ELIGIBLE">Not eligible</option>
            <option value="INFO_REQUESTED">Request information</option>
          </select>
        </Field>
        <Field label="Overall notes">
          <textarea className="input min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? 'Recording…' : 'Submit screening decision'}</Button>
      </form>
    </Card>
  );
}
