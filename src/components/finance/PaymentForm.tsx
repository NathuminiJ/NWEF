'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field } from '@/components/ui';
import { postJson } from '@/lib/client';

interface Option {
  id: string;
  label: string;
  invoiceId: string | null;
  outstanding: number;
}

export function PaymentForm({ options }: { options: Option[] }) {
  const [instalmentId, setInstalmentId] = useState(options[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const option = options.find((item) => item.id === instalmentId);
      if (!option?.invoiceId) throw new Error('Selected instalment has no linked fee invoice');
      await postJson('/api/finance/payments', {
        instalmentId,
        invoiceId: option.invoiceId,
        amount: Number(amount),
        method,
        reference,
      });
      setMessage('Payment recorded.');
      setAmount('');
      setReference('');
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return (
    <Card title="Record a payment">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        {error && <div className="md:col-span-2"><Alert tone="red">{error}</Alert></div>}
        {message && <div className="md:col-span-2"><Alert tone="green">{message}</Alert></div>}
        <Field label="Instalment">
          <select className="input" value={instalmentId} onChange={(event) => setInstalmentId(event.target.value)}>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Amount (LKR)"><input className="input" type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>
        <Field label="Method">
          <select className="input" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
            <option value="ONLINE_GATEWAY">Online gateway</option>
            <option value="INTERNAL_JOURNAL">Internal journal</option>
          </select>
        </Field>
        <Field label="Payment reference"><input className="input" value={reference} onChange={(event) => setReference(event.target.value)} required /></Field>
        <div className="md:col-span-2"><Button type="submit">Record payment</Button></div>
      </form>
    </Card>
  );
}
