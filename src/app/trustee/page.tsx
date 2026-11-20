import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui';
import { BudgetTiles } from '@/components/trustee/BudgetTiles';
import { BatchApprovalQueue } from '@/components/trustee/BatchApprovalQueue';
import { budgets, getTrusteeQueue } from '@/services/trustee';
import { requirePage } from '@/lib/page-auth';

export default async function TrusteePage() {
  const user = await requirePage({ roles: ['TRUSTEE', 'SUPER_ADMIN'] });
  const [tiles, queue] = await Promise.all([budgets(), getTrusteeQueue()]);

  return (
    <AppShell user={user}>
      <header className="page-heading">
        <h1>Trust board</h1>
        <p className="page-lede">Batch decisions, budget visibility and automated award letters.</p>
      </header>
      <Card title="Budget overview" description="Committed amounts update on approval; paid amounts update when finance records payments.">
        <BudgetTiles tiles={tiles} />
      </Card>
      <BatchApprovalQueue
        items={queue.map((item) => ({
          id: item.id,
          referenceNo: item.referenceNo,
          child: { fullName: item.child.fullName, school: item.child.school },
          guardian: { fullName: item.guardian.fullName },
          scores: item.scores.map((score) => ({ weightedTotal: String(score.weightedTotal), recommendation: score.recommendation })),
          status: item.status,
        }))}
      />
    </AppShell>
  );
}
