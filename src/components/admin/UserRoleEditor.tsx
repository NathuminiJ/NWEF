'use client';

import { useState } from 'react';
import type { Role } from '@prisma/client';
import { Alert, Badge, Button, Card } from '@/components/ui';
import { patchJson } from '@/lib/client';

interface UserRow {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  isActive: boolean;
}

const roles: Role[] = ['APPLICANT', 'ADMIN_OFFICER', 'SCREENING_REVIEWER', 'INTERVIEW_PANEL', 'TRUSTEE', 'FINANCE_OFFICER', 'SUPER_ADMIN'];

export function UserRoleEditor({ users }: { users: UserRow[] }) {
  const [rows, setRows] = useState(users);
  const [error, setError] = useState<string | null>(null);

  async function update(id: string, patch: { role?: Role; isActive?: boolean }) {
    setError(null);
    try {
      const updated = await patchJson<UserRow>(`/api/admin/users/${id}`, patch);
      setRows((current) => current.map((row) => (row.id === id ? updated : row)));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return (
    <Card title="Users & roles" description="Changing a role immediately revokes all active sessions for that user.">
      {error && <Alert tone="red">{error}</Alert>}
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">{row.fullName}</td>
                <td>{row.phone}</td>
                <td>
                  <select className="input" value={row.role} onChange={(event) => update(row.id, { role: event.target.value as Role })}>
                    {roles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
                  </select>
                </td>
                <td><Badge tone={row.isActive ? 'green' : 'red'}>{row.isActive ? 'Active' : 'Disabled'}</Badge></td>
                <td><Button variant="secondary" onClick={() => update(row.id, { isActive: !row.isActive })}>{row.isActive ? 'Disable' : 'Enable'}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
