import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Card, EmptyState } from '@/components/ui';
import { ScreeningChecklist } from '@/components/screening/ScreeningChecklist';
import { getScreeningQueue } from '@/services/screening';
import { formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/page-auth';
import { PERMISSIONS } from '@/lib/rbac';

export default async function ScreeningPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const user = await requirePage({ permission: PERMISSIONS.SCREENING_REVIEW });
  const queue = await getScreeningQueue(user);
  const { app: selectedId } = await searchParams;
  const selected = queue.find((item) => item.id === selectedId) ?? queue[0];

  return (
    <AppShell user={user}>
      <header className="page-heading">
        <h1>Screening queue</h1>
        <p className="page-lede">Complete the checklist and record a shortlisting outcome.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <Card title={`Awaiting review (${queue.length})`}>
          {queue.length === 0 ? (
            <EmptyState title="Queue is clear" />
          ) : (
            <div className="space-y-2">
              {queue.map((item) => (
                <Link
                  key={item.id}
                  href={`/screening?app=${item.id}`}
                  className={`block border p-3 ${selected?.id === item.id ? 'border-brand bg-surface' : 'border-line hover:bg-surface'}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-medium">{item.referenceNo}</span>
                    <Badge tone={item.sla.flag === 'OVERDUE' ? 'red' : item.sla.flag === 'DUE_SOON' ? 'amber' : 'slate'}>{item.sla.flag}</Badge>
                  </div>
                  <p className="text-xs text-muted">{item.child.fullName} · {item.stream.replaceAll('_', ' ')}</p>
                  <p className="text-xs text-muted">Due {formatDate(item.sla.effectiveDueAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <div>
          {selected ? (
            <div className="space-y-4">
              <Card title={selected.referenceNo} description={`${selected.child.fullName} · ${selected.child.school}`}>
                <p className="text-sm text-muted">
                  {selected.stream === 'OLD_TINITIAN_SUPPORT'
                    ? `Circumstances: ${selected.streamA?.circumstances || 'None provided'}`
                    : `Sport: ${selected.streamB?.sport} · ${selected.streamB?.position} · ${selected.streamB?.level}`}
                </p>
                <Link className="mt-2 inline-block text-sm text-brand hover:underline" href={`/applications/${selected.id}`}>
                  View full application and documents
                </Link>
              </Card>
              <ScreeningChecklist applicationId={selected.id} stream={selected.stream} />
            </div>
          ) : (
            <EmptyState title="Select an application" message="Screening checklist will appear here." />
          )}
        </div>
      </div>
    </AppShell>
  );
}
