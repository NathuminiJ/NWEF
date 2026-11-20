'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field } from '@/components/ui';
import { GRADE_OPTIONS, TRINITY_HOUSE_OPTIONS } from '@/lib/constants';
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
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [school, setSchool] = useState('Trinity College');
  const [grade, setGrade] = useState<string>('Grade 7');
  const [house, setHouse] = useState<string>('Not applicable');
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
          fullName: childName.trim(),
          dateOfBirth: new Date(`${dateOfBirth}T00:00:00`).toISOString(),
          school: school.trim(),
          grade,
          house,
        },
      });
      router.push(`/apply/${application.id}`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ready = childName.trim().length >= 2 && Boolean(dateOfBirth) && Boolean(grade) && Boolean(house);

  return (
    <form onSubmit={create} className="space-y-4">
      {error && <Alert tone="red">{error}</Alert>}

      <Card title="Choose a stream">
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
      </Card>

      <Card title="Child details" description="Choose the grade and Trinity house from the lists — no free-text entry is needed.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name of child">
            <input
              className="input"
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </Field>
          <Field label="Date of birth">
            <input
              className="input"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              required
              max={new Date().toISOString().slice(0, 10)}
            />
          </Field>
          <Field label="School">
            <input className="input" value={school} onChange={(event) => setSchool(event.target.value)} required minLength={2} />
          </Field>
          <Field label="Grade">
            <select className="input" value={grade} onChange={(event) => setGrade(event.target.value)} required>
              {GRADE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trinity house" hint="Select ‘Not applicable’ if the child has not been assigned a house.">
            <select className="input" value={house} onChange={(event) => setHouse(event.target.value)} required>
              {TRINITY_HOUSE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Button type="submit" disabled={busy || !ready}>
        {busy ? 'Creating…' : 'Start application'}
      </Button>
      <p className="text-xs text-muted">You can complete all remaining details in the next step. Drafts save automatically.</p>
    </form>
  );
}
