import { AppShell } from '@/components/layout/AppShell';
import { ApplicationWizard } from '@/components/application/ApplicationWizard';
import { Alert, Card } from '@/components/ui';
import { prisma } from '@/lib/db';
import { getAccessibleApplication } from '@/services/access';
import { requirePage } from '@/lib/page-auth';
import { PERMISSIONS } from '@/lib/rbac';

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage({ permission: PERMISSIONS.APPLICATION_UPDATE_OWN });
  const { id } = await params;
  const application = await getAccessibleApplication(id, user);
  if (application.status !== 'DRAFT') {
    return (
      <AppShell user={user}>
        <Alert tone="amber">This application has been submitted and can no longer be edited.</Alert>
      </AppShell>
    );
  }
  const [detail, guardian] = await Promise.all([
    prisma.application.findUnique({
      where: { id },
      include: { child: true, streamA: true, streamB: true, documents: { where: { deletedAt: null } } },
    }),
    prisma.guardianProfile.findUnique({ where: { userId: user.id } }),
  ]);
  if (!detail) return null;

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <div>
          <h1>Application {detail.referenceNo}</h1>
          <p className="mt-1 text-sm text-slate-600">Complete the steps below. Drafts are saved automatically.</p>
        </div>
        <Card>
          <ApplicationWizard
            application={{
              id: detail.id,
              stream: detail.stream,
              status: detail.status,
              child: {
                fullName: detail.child.fullName,
                dateOfBirth: detail.child.dateOfBirth.toISOString(),
                school: detail.child.school,
                grade: detail.child.grade,
                gender: detail.child.gender,
              },
              guardian,
              streamA: detail.streamA,
              streamB: detail.streamB,
              documents: detail.documents.map((document) => ({
                id: document.id,
                type: document.type,
                fileName: document.fileName,
                sizeBytes: document.sizeBytes,
                createdAt: document.createdAt.toISOString(),
              })),
            }}
          />
        </Card>
      </div>
    </AppShell>
  );
}
