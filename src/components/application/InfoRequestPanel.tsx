'use client';

import { useState } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { postJson } from '@/lib/client';
import { formatDate } from '@/lib/utils';

interface InfoRequest {
  id: string;
  message: string;
  createdAt: string;
  dueAt: string | null;
  response: string | null;
  respondedAt: string | null;
}

export function InfoRequestPanel({
  applicationId,
  requests,
  canRespond,
}: {
  applicationId: string;
  requests: InfoRequest[];
  canRespond: boolean;
}) {
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = requests.find((request) => !request.respondedAt);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/applications/${applicationId}/info-response`, { response });
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="space-y-3 border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="font-medium text-amber-900">Information requested</p>
      <p className="text-sm text-amber-800">{open.message}</p>
      <p className="text-xs text-amber-700">Requested {formatDate(open.createdAt)} — screening clock is paused.</p>
      {error && <Alert tone="red">{error}</Alert>}
      {canRespond && (
        <>
          <Field label="Your response">
            <textarea className="input min-h-28" value={response} onChange={(event) => setResponse(event.target.value)} />
          </Field>
          <Button type="button" onClick={submit} disabled={busy || response.trim().length < 5}>
            {busy ? 'Sending…' : 'Send response'}
          </Button>
        </>
      )}
    </div>
  );
}
