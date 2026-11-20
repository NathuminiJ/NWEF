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
    <div className="alert alert-warning space-y-3">
      <p className="font-medium text-ink">Information requested</p>
      <p className="text-sm text-ink">{open.message}</p>
      <p className="text-xs text-muted">Requested {formatDate(open.createdAt)} — screening clock is paused.</p>
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
