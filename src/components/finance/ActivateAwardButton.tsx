'use client';

import { useState } from 'react';
import { Alert, Button } from '@/components/ui';
import { postJson } from '@/lib/client';

export function ActivateAwardButton({ applicationId, amount }: { applicationId: string; amount: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const portion = Math.round((amount / 3) * 100) / 100;
      await postJson(`/api/applications/${applicationId}/activate-award`, {
        instalments: [1, 2, 3].map((sequence) => ({
          sequence,
          amount: sequence === 3 ? Math.round((amount - portion * 2) * 100) / 100 : portion,
          dueDate: new Date(Date.now() + sequence * 30 * 86_400_000).toISOString(),
        })),
      });
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <Alert tone="red">{error}</Alert>}
      <Button onClick={activate} disabled={busy}>{busy ? 'Activating…' : 'Activate award & create instalments'}</Button>
    </div>
  );
}
