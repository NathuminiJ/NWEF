import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Card, EmptyState } from '@/components/ui';
import { ScoreCard } from '@/components/interview/ScoreCard';
import { AttendButton } from '@/components/interview/AttendButton';
import { prisma } from '@/lib/db';
import { requirePage } from '@/lib/page-auth';
import { formatDate } from '@/lib/utils';

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const user = await requirePage({ roles: ['INTERVIEW_PANEL', 'SUPER_ADMIN'] });
  const [applications, { app: selectedId }] = await Promise.all([
    prisma.application.findMany({
      where: { status: { in: ['INTERVIEW_SCHEDULED', 'INTERVIEWED', 'RECOMMENDED', 'NOT_RECOMMENDED'] } },
      include: { child: true, booking: { include: { slot: { include: { session: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    searchParams,
  ]);
  const selected = applications.find((item) => item.id === selectedId) ?? applications[0];

  return (
    <AppShell user={user}>
      <div>
        <h1>Interview panel</h1>
        <p className="mt-1 text-sm text-slate-600">Independent scoring with stream-specific weighted criteria.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <Card title={`Interview queue (${applications.length})`}>
          {applications.length === 0 ? (
            <EmptyState title="No interviews scheduled" />
          ) : (
            <div className="space-y-2">
              {applications.map((item) => (
                <Link
                  key={item.id}
                  href={`/panel?app=${item.id}`}
                  className={`block border p-3 ${selected?.id === item.id ? 'border-brand-500 bg-brand-50' : 'border-[var(--line)] hover:bg-cream'}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-medium">{item.referenceNo}</span>
                    <Badge tone="blue">{item.status.replaceAll('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{item.child.fullName} · {item.stream.replaceAll('_', ' ')}</p>
                  {item.booking && <p className="text-xs text-slate-500">{formatDate(item.booking.slot.startsAt)}</p>}
                </Link>
              ))}
            </div>
          )}
        </Card>
        <div>
          {selected ? (
            <div className="space-y-4">
              <Card title={selected.referenceNo} description={selected.child.fullName}>
                <div className="flex flex-wrap items-center gap-3">
                  <Link className="text-sm text-brand-600 hover:underline" href={`/applications/${selected.id}`}>View application</Link>
                  {selected.status === 'INTERVIEW_SCHEDULED' && <AttendButton applicationId={selected.id} />}
                </div>
              </Card>
              <ScoreCard applicationId={selected.id} stream={selected.stream} />
            </div>
          ) : (
            <EmptyState title="Select an interview" message="The scorecard will appear here." />
          )}
        </div>
      </div>
    </AppShell>
  );
}
