'use client';

import { useState } from 'react';
import { Alert, Badge, Button, Card, Field } from '@/components/ui';
import { postJson } from '@/lib/client';

interface QueueItem {
  id: string;
  referenceNo: string;
  child: { fullName: string; school: string };
  guardian: { fullName: string };
  scores: Array<{ weightedTotal: string | number; recommendation: string }>;
  status: string;
}

export function BatchApprovalQueue({ items }: { items: QueueItem[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [decision, setDecision] = useState('APPROVE');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await postJson<{ succeeded: number; failed: Array<{ reason: string }> }>('/api/trustee/decisions', {
        applicationIds: selected,
        decision,
        approvedAmount: amount ? Number(amount) : undefined,
        notes,
      });
      setResult(`${response.succeeded} decision(s) recorded. ${response.failed.length} failed.`);
      setSelected([]);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Trustee decision queue">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="red">{error}</Alert>}
        {result && <Alert tone="green">{result}</Alert>}
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Decision">
            <select className="input" value={decision} onChange={(event) => setDecision(event.target.value)}>
              <option value="APPROVE">Approve</option>
              <option value="WAITLIST">Waitlist</option>
              <option value="DECLINE">Decline</option>
            </select>
          </Field>
          <Field label="Approved amount (per application)">
            <input className="input" type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <Field label="Notes">
            <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Reference</th>
                <th>Child</th>
                <th>Panel scores</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const average = item.scores.length
                  ? item.scores.reduce((sum, score) => sum + Number(score.weightedTotal), 0) / item.scores.length
                  : 0;
                return (
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></td>
                    <td className="font-medium">{item.referenceNo}</td>
                    <td>{item.child.fullName}<br /><span className="text-xs text-muted">{item.child.school}</span></td>
                    <td>{average.toFixed(2)} / 5 · {item.scores.length} score(s)</td>
                    <td><Badge tone="blue">{item.status.replaceAll('_', ' ')}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <p className="text-sm text-muted">No applications are awaiting a trustee decision.</p>}
        <Button type="submit" disabled={selected.length === 0 || busy || (decision === 'APPROVE' && !amount)}>
          {busy ? 'Recording decisions…' : `Record ${selected.length} decision(s)`}
        </Button>
        <p className="text-xs text-muted">Batch ID is generated per submission and stored on each decision record.</p>
      </form>
    </Card>
  );
}
