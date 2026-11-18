'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/client';
import { dashboardForRole } from '@/lib/rbac';
import { Alert, Button, Field } from '@/components/ui';

export function OtpLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await postJson<{ identifier: string; devCode?: string }>('/api/auth/otp/request', {
        phone: identifier,
      });
      setIdentifier(result.identifier);
      setDevCode(result.devCode ?? null);
      setStep('verify');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await postJson<{ user: { role: Parameters<typeof dashboardForRole>[0] } }>(
        '/api/auth/otp/verify',
        { identifier, code },
      );
      router.push(next ?? dashboardForRole(result.user.role));
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={step === 'request' ? requestCode : verify}
      className="space-y-4"
      aria-busy={busy}
      aria-describedby={error ? 'login-error' : undefined}
    >
      {error && (
        <Alert id="login-error" tone="red">
          {error}
        </Alert>
      )}
      {step === 'request' ? (
        <>
          <Field label="Mobile number" hint="Use the number registered for your account. Example: 0771234567">
            <input
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="0771234567"
              required
            />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            {busy ? 'Sending…' : 'Send verification code'}
          </Button>
        </>
      ) : (
        <>
          <Alert tone="blue" role="status">
            A 6-digit code was sent to {identifier}. {devCode && <strong>Dev code: {devCode}</strong>}
          </Alert>
          <Field label="Verification code">
            <input
              className="input text-center text-lg tracking-[0.35em]"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              required
            />
          </Field>
          <Button type="submit" loading={busy} disabled={code.length !== 6} className="w-full">
            {busy ? 'Verifying…' : 'Sign in'}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-brand-700 transition hover:text-navy hover:underline"
            onClick={() => {
              setStep('request');
              setCode('');
              setDevCode(null);
            }}
          >
            Use a different number
          </button>
        </>
      )}
    </form>
  );
}
