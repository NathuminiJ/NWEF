import { AppShell } from '@/components/layout/AppShell';
import { Badge, Card, EmptyState, Stat } from '@/components/ui';
import { SessionScheduler } from '@/components/admin/SessionScheduler';
import { slaReport } from '@/services/admin';
import { listInterviewSessions } from '@/services/interviews';
import { formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/page-auth';

export default async function AdminOverviewPage() {
  const user = await requirePage({ roles: ['ADMIN_OFFICER', 'SUPER_ADMIN'] });
  const [report, sessions] = await Promise.all([slaReport(user), listInterviewSessions()]);
  const overdue = report.filter((item) => item.sla.flag === 'OVERDUE').length;
  const dueSoon = report.filter((item) => item.sla.flag === 'DUE_SOON').length;
  const paused = report.filter((item) => item.sla.paused).length;

  return (
    <AppShell user={user}>
      <div>
        <h1>Admin console</h1>
        <p className="mt-1 text-sm text-slate-600">Screening turnaround, SLA flags and interview operations.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Open screenings" value={String(report.length)} />
        <Stat label="Overdue" value={String(overdue)} />
        <Stat label="Due soon" value={String(dueSoon)} />
        <Stat label="Clock paused" value={String(paused)} />
      </div>
      <Card title="Screening pipeline">
        {report.length === 0 ? (
          <EmptyState title="Nothing in the screening pipeline" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Reference</th><th>Status</th><th>Due</th><th>Flag</th></tr></thead>
              <tbody>
                {report.map((item) => (
                  <tr key={item.id}>
                    <td><a className="text-brand-600 hover:underline" href={`/applications/${item.id}`}>{item.referenceNo}</a></td>
                    <td>{item.status.replaceAll('_', ' ')}</td>
                    <td>{formatDate(item.sla.effectiveDueAt)}</td>
                    <td><Badge tone={item.sla.flag === 'OVERDUE' ? 'red' : item.sla.flag === 'DUE_SOON' ? 'amber' : 'slate'}>{item.label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <SessionScheduler />
      <Card title="Published interview sessions" description={`${sessions.length} session(s) available for self-booking.`}>
        <ul className="space-y-2 text-sm">
          {sessions.map((session) => (
            <li key={session.id} className="bg-cream px-3 py-2">
              <strong>{session.title}</strong> · {session.slots.length} slot(s) · {session.location ?? session.mode}
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
