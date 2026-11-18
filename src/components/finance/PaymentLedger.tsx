import { Badge, Card, EmptyState } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/utils';

interface LedgerRow {
  id: string;
  sequence: number;
  amount: string | number | { toString(): string };
  dueDate: Date | string;
  status: string;
  award: {
    application: { referenceNo: string; child: { fullName: string }; guardian: { fullName: string } };
  };
  invoice: { invoiceNo: string; status: string } | null;
  payments: Array<{ reference: string; amount: string | number | { toString(): string }; paidAt: Date | string }>;
}

export function PaymentLedger({ rows }: { rows: LedgerRow[] }) {
  return (
    <Card title="Instalment ledger" description="Instalments are tracked against Trinity College fee invoices.">
      {rows.length === 0 ? (
        <EmptyState title="No instalments yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Child / guardian</th>
                <th>Instalment</th>
                <th>Invoice</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{row.award.application.referenceNo}</td>
                  <td>
                    {row.award.application.child.fullName}
                    <br /><span className="text-xs text-slate-500">{row.award.application.guardian.fullName}</span>
                  </td>
                  <td>#{row.sequence}</td>
                  <td>{row.invoice?.invoiceNo ?? '—'}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td>{formatMoney(row.amount)}</td>
                  <td>
                    <Badge tone={row.status === 'PAID' ? 'green' : row.status === 'OVERDUE' ? 'red' : 'amber'}>{row.status}</Badge>
                    {row.payments.map((payment) => (
                      <p key={payment.reference} className="mt-1 text-xs text-slate-500">
                        {payment.reference} · {formatMoney(payment.amount)} · {formatDate(payment.paidAt)}
                      </p>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
