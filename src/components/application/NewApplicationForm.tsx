'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field } from '@/components/ui';
import { postJson } from '@/lib/client';
import type { Stream } from '@prisma/client';

const streams: Array<{ value: Stream; title: string; description: string }> = [
  {
    value: 'OLD_TINITIAN_SUPPORT',
    title: 'Stream A — Old Trinitian Support',
    description: 'Parent/guardian supported applications. No income or salary documents are requested.',
  },
  {
    value: 'SPORTS_SCHOLARSHIP',
    title: 'Stream B — Sports Scholarship',
    description: 'Recruitment stream for athletes, including sport, position, level, results and coach details.',
  },
];

export function NewApplicationForm() {
  const router = useRouter();
  const [stream, setStream] = useState<Stream>('OLD_TINITIAN_SUPPORT');
  const [childName, setChildName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const application = await postJson<{ id: string }>('/api/applications', {
        stream,
        child: {
          fullName: childName,
          dateOfBirth: new Date('2012-01-01').toISOString(),
          school: 'Trinity College',
          grade: 'Grade 7',
        },
      });
      router.push(`/apply/${application.id}`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="space-y-4">
      {error && <Alert tone="red">{error}</Alert>}
      <div className="grid gap-3 md:grid-cols-2">
        {streams.map((item) => (
          <label
            key={item.value}
            className={`cursor-pointer border p-4 ${stream === item.value ? 'border-brand bg-surface' : 'border-line bg-canvas'}`}
          >
            <input
              type="radio"
              className="mr-2"
              name="stream"
              value={item.value}
              checked={stream === item.value}
              onChange={() => setStream(item.value)}
            />
            <span className="font-medium">{item.title}</span>
            <p className="mt-2 text-sm text-muted">{item.description}</p>
          </label>
        ))}
      </div>
      <Card title="Child details">
        <Field label="Full name of child">
          <input className="input" value={childName} onChange={(event) => setChildName(event.target.value)} required minLength={2} />
        </Field>
      </Card>
      <Button type="submit" disabled={busy || childName.trim().length < 2}>
        {busy ? 'Creating…' : 'Start application'}
      </Button>
      <p className="text-xs text-muted">You can complete all remaining details in the next step. Drafts save automatically.</p>
    </form>
  );
}
