import { AppShell } from '@/components/layout/AppShell';
import { NewApplicationForm } from '@/components/application/NewApplicationForm';
import { requirePage } from '@/lib/page-auth';
import { PERMISSIONS } from '@/lib/rbac';

export default async function NewApplicationPage() {
  const user = await requirePage({ permission: PERMISSIONS.APPLICATION_CREATE });
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="page-heading">
          <h1>New scholarship application</h1>
          <p className="page-lede">Choose the correct stream. Multi-child support is available through your parent/guardian account.</p>
        </header>
        <NewApplicationForm />
      </div>
    </AppShell>
  );
}
