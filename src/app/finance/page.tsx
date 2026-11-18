import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui';
import { PaymentLedger } from '@/components/finance/PaymentLedger';
import { PaymentForm } from '@/components/finance/PaymentForm';
import { InvoiceForm } from '@/components/finance/InvoiceForm';
import { ActivateAwardButton } from '@/components/finance/ActivateAwardButton';
import { getLedger, listInvoices } from '@/services/finance';
import { budgets } from '@/services/trustee';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/utils';
import { requirePage } from '@/lib/page-auth';

export default async function FinancePage() {
  const user = await requirePage({ roles: ['FINANCE_OFFICER', 'SUPER_ADMIN'] });
  const [ledger, invoices, tiles, children, accepted] = await Promise.all([
    getLedger(),
    listInvoices(),
    budgets(),
    prisma.child.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
    prisma.application.findMany({
      where: { status: 'AWARD_ACCEPTED' },
      include: { child: true, trusteeDecision: true },
    }),
  ]);
  const options = ledger
    .filter((row) => row.status !== 'PAID')
    .map((row) => ({
      id: row.id,
      label: `${row.award.application.referenceNo} · Instalment ${row.sequence} · ${formatMoney(row.amount)}`,
      invoiceId: row.invoiceId ?? row.invoice?.id ?? null,
      outstanding: Number(row.amount),
    }));

  return (
    <AppShell user={user}>
      <div>
        <h1>Finance</h1>
        <p className="mt-1 text-sm text-slate-600">Payment ledger against Trinity College fee invoices.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.stream} title={tile.stream === 'OLD_TINITIAN_SUPPORT' ? 'Stream A' : 'Stream B'}>
            <p className="text-2xl font-semibold">{formatMoney(tile.available)}</p>
            <p className="text-xs text-slate-500">Available of {formatMoney(tile.budget)} budget</p>
          </Card>
        ))}
      </div>
      {accepted.length > 0 && (
        <Card title="Accepted awards awaiting activation">
          <div className="space-y-3">
            {accepted.map((application) => (
              <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--line)] p-3">
                <div>
                  <p className="text-sm font-medium">{application.referenceNo} · {application.child.fullName}</p>
                  <p className="text-xs text-slate-500">Approved {formatMoney(application.trusteeDecision?.approvedAmount ?? 0)}</p>
                </div>
                <ActivateAwardButton
                  applicationId={application.id}
                  amount={Number(application.trusteeDecision?.approvedAmount ?? 0)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
      <InvoiceForm>{children}</InvoiceForm>
      <PaymentForm options={options} />
      <PaymentLedger rows={ledger} />
      <Card title={`Fee invoices (${invoices.length})`}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Invoice</th><th>Child</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-medium">{invoice.invoiceNo}</td>
                  <td>{invoice.child.fullName}</td>
                  <td>{formatMoney(invoice.amount)}</td>
                  <td>{invoice.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
