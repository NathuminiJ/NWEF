'use client';

import { useState } from 'react';
import { Alert, Button, Card, Field } from '@/components/ui';
import { postJson } from '@/lib/client';

export function InvoiceForm({ children }: { children: Array<{ id: string; fullName: string }> }) {
  const [childId, setChildId] = useState(children[0]?.id ?? '');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await postJson('/api/finance/invoices', {
        childId,
        invoiceNo,
        amount: Number(amount),
        dueDate: new Date(dueDate).toISOString(),
      });
      setMessage('Invoice created.');
      setInvoiceNo('');
      setAmount('');
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return (
    <Card title="Register a Trinity College fee invoice">
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        {error && <div className="md:col-span-2"><Alert tone="red">{error}</Alert></div>}
        {message && <div className="md:col-span-2"><Alert tone="green">{message}</Alert></div>}
        <Field label="Child">
          <select className="input" value={childId} onChange={(event) => setChildId(event.target.value)}>
            {children.map((child) => <option key={child.id} value={child.id}>{child.fullName}</option>)}
          </select>
        </Field>
        <Field label="Invoice number"><input className="input" value={invoiceNo} onChange={(event) => setInvoiceNo(event.target.value)} required /></Field>
        <Field label="Amount (LKR)"><input className="input" type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>
        <Field label="Due date"><input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></Field>
        <div className="md:col-span-2"><Button type="submit">Create invoice</Button></div>
      </form>
    </Card>
  );
}
