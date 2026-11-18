'use client';

import { useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { postJson } from '@/lib/client';

export function AttendButton({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/applications/${applicationId}/interview/attended`, {});
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <Alert tone="red">{error}</Alert>}
      <Button variant="secondary" onClick={mark} disabled={busy}>{busy ? 'Recording…' : 'Mark attended'}</Button>
    </div>
  );
}
