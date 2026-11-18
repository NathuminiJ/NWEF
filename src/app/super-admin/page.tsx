import { AppShell } from '@/components/layout/AppShell';
import { Badge, Card, Stat } from '@/components/ui';
import { UserRoleEditor } from '@/components/admin/UserRoleEditor';
import { auditIntegrity, listDataRequests, listUsers } from '@/services/admin';
import { formatDate } from '@/lib/utils';
import { requirePage } from '@/lib/page-auth';

export default async function SuperAdminPage() {
  const user = await requirePage({ roles: ['SUPER_ADMIN'] });
  const [users, integrity, requests] = await Promise.all([listUsers(), auditIntegrity(user), listDataRequests(user)]);

  return (
    <AppShell user={user}>
      <div>
        <h1>Super administration</h1>
        <p className="mt-1 text-sm text-slate-600">Role management, audit integrity and PDPA request handling.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Accounts" value={String(users.length)} />
        <Stat label="Audit chain" value={integrity.valid ? 'Valid' : 'Broken'} sub={integrity.brokenAt ?? undefined} />
        <Stat label="PDPA requests" value={String(requests.length)} />
      </div>
      <UserRoleEditor users={users} />
      <Card title="Data subject requests" description="Sri Lanka Personal Data Protection Act request register.">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Requester</th><th>Type</th><th>Status</th><th>Due</th></tr></thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.user.fullName}</td>
                  <td>{request.type}</td>
                  <td><Badge tone={request.status === 'COMPLETED' ? 'green' : 'amber'}>{request.status}</Badge></td>
                  <td>{formatDate(request.dueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
