'use client';

import { useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { postJson } from '@/lib/client';

export function RenewalButton({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function renew() {
    setBusy(true);
    setError(null);
    try {
      const renewal = await postJson<{ id: string }>(`/api/applications/${applicationId}/renewal`, {});
      window.location.href = `/apply/${renewal.id}`;
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <Alert tone="red">{error}</Alert>}
      <Button type="button" onClick={renew} disabled={busy}>
        {busy ? 'Opening renewal…' : 'Start annual renewal'}
      </Button>
    </div>
  );
}
