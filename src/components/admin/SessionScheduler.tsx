'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field } from '@/components/ui';
import { postJson } from '@/lib/client';

export function SessionScheduler() {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState('IN_PERSON');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await postJson('/api/interview-sessions', {
        title,
        location: location || undefined,
        mode,
        slots: [{ startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), capacity }],
      });
      setMessage('Interview session published.');
      setTitle('');
      setStartsAt('');
      setEndsAt('');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Schedule an interview session">
      <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
        {error && <div className="md:col-span-2"><Alert tone="red">{error}</Alert></div>}
        {message && <div className="md:col-span-2"><Alert tone="green">{message}</Alert></div>}
        <Field label="Title"><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required /></Field>
        <Field label="Location or meeting link"><input className="input" value={location} onChange={(event) => setLocation(event.target.value)} /></Field>
        <Field label="Mode">
          <select className="input" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="IN_PERSON">In person</option>
            <option value="ONLINE">Online</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </Field>
        <Field label="Capacity"><input className="input" type="number" min={1} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></Field>
        <Field label="Starts at"><input className="input" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></Field>
        <Field label="Ends at"><input className="input" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></Field>
        <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish session'}</Button></div>
      </form>
    </Card>
  );
}
