import { NextResponse } from 'next/server';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, requireUser } from '@/lib/auth/session';
import { route } from '@/lib/api';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { generateApplicationSummaryPdf } from '@/lib/pdf';
import { getApplicationDetail } from '@/services/applications';

export const runtime = 'nodejs';

export const GET = route(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  const application = await getApplicationDetail(id, user);
  if (!application) throw new NotFoundError('Application not found');
  const guardianProfile = await prisma.guardianProfile.findUnique({ where: { userId: application.guardianId } });

  const pdf = await generateApplicationSummaryPdf({
    referenceNo: application.referenceNo,
    status: application.status,
    stream: application.stream,
    submittedAt: application.submittedAt,
    child: {
      fullName: application.child.fullName,
      dateOfBirth: application.child.dateOfBirth,
      school: application.child.school,
      grade: application.child.grade,
      house: application.child.house,
      gender: application.child.gender,
    },
    guardian: application.guardian
      ? {
          fullName: application.guardian.fullName,
          phone: application.guardian.phone,
          email: application.guardian.email,
          relationshipToChild: guardianProfile?.relationshipToChild,
          addressLine1: guardianProfile?.addressLine1,
          city: guardianProfile?.city,
          district: guardianProfile?.district,
        }
      : null,
    streamA: application.streamA,
    streamB: application.streamB,
    documents: application.documents.map((document) => ({
      type: document.type,
      fileName: document.fileName,
      createdAt: document.createdAt,
    })),
    timeline: application.timeline.map((event) => ({
      label: event.toStatus.replaceAll('_', ' '),
      createdAt: event.createdAt,
      actor: event.actor?.fullName ?? null,
    })),
  });

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_DOWNLOAD',
    entityType: 'Application',
    entityId: application.id,
    metadata: { format: 'pdf', kind: 'application-summary' },
    ...(await getRequestMeta()),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nwef-application-${application.referenceNo}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
