'use client';

import { useRef, useState } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { postJson } from '@/lib/client';
import { formatMoney } from '@/lib/utils';

export function AwardAcceptance({
  applicationId,
  amount,
  currency,
}: {
  applicationId: string;
  amount: number;
  currency: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signatureName, setSignatureName] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    drawing.current = true;
    const point = position(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const point = position(event);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasDrawing(true);
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/applications/${applicationId}/accept-award`, {
        signatureName,
        signatureDataUrl: hasDrawing ? canvasRef.current?.toDataURL('image/png') : undefined,
        accepted: true,
      });
      window.location.reload();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="alert alert-success space-y-4">
      <div>
        <p className="numeric font-medium text-ink">Award offered: {formatMoney(amount, currency)}</p>
        <p className="text-sm text-muted">Review the award letter, then sign below to accept.</p>
        <a className="text-sm text-brand hover:underline" href={`/api/applications/${applicationId}/award-letter`}>
          Download award letter
        </a>
      </div>
      {error && <Alert tone="red">{error}</Alert>}
      <Field label="Type your full name as a signature">
        <input className="input" value={signatureName} onChange={(event) => setSignatureName(event.target.value)} />
      </Field>
      <div>
        <span className="label">Or draw your signature</span>
        <canvas
          ref={canvasRef}
          width={480}
          height={120}
          className="w-full max-w-md touch-none rounded-sm border border-line bg-canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
        <button type="button" className="mt-1 text-xs text-brand hover:underline" onClick={clear}>
          Clear signature
        </button>
      </div>
      <Button type="button" onClick={accept} disabled={busy || signatureName.trim().length < 3}>
        {busy ? 'Submitting…' : 'Sign and accept award'}
      </Button>
    </div>
  );
}
