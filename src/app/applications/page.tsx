import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Card, EmptyState } from '@/components/ui';
import { listApplications } from '@/services/applications';
import { getSlaInfo, slaLabel } from '@/lib/sla';
import { STATUS_LABELS } from '@/lib/workflow';
import { formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/page-auth';

function tone(flag: string): 'slate' | 'blue' | 'green' | 'amber' | 'red' {
  if (flag === 'OVERDUE') return 'red';
  if (flag === 'DUE_SOON') return 'amber';
  if (flag === 'PAUSED') return 'blue';
  if (flag === 'ON_TRACK') return 'green';
  return 'slate';
}

export default async function ApplicationsPage() {
  const user = await requirePage();
  const { items } = await listApplications(user);

  return (
    <AppShell user={user}>
      <header className="page-heading flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Applications</h1>
          <p className="page-lede">Track progress, respond to requests and manage awards.</p>
        </div>
        {user.role === 'APPLICANT' && (
          <Link className="btn" href="/apply">
            New application
          </Link>
        )}
      </header>
      <Card>
        {items.length === 0 ? (
          <EmptyState title="No applications yet" message="Start a new application to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Child</th>
                  <th>Stream</th>
                  <th>Status</th>
                  <th>Screening SLA</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((application) => {
                  const sla = getSlaInfo(application);
                  return (
                    <tr key={application.id}>
                      <td>
                        <Link className="font-medium text-brand hover:underline" href={`/applications/${application.id}`}>
                          {application.referenceNo}
                        </Link>
                      </td>
                      <td>{application.child.fullName}</td>
                      <td>{application.stream === 'OLD_TINITIAN_SUPPORT' ? 'Stream A' : 'Stream B'}</td>
                      <td><Badge tone="blue">{STATUS_LABELS[application.status]}</Badge></td>
                      <td><Badge tone={tone(sla.flag)}>{slaLabel(sla.flag)}</Badge></td>
                      <td className="text-muted">{formatDate(application.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
