import { NextResponse } from 'next/server';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { route } from '@/lib/api';
import { storage } from '@/lib/storage';
import { getAccessibleApplication } from '@/services/access';

export const runtime = 'nodejs';

export const GET = route(async (_request, context) => {
  const { documentId } = await context.params;
  const user = await requireUser();
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.deletedAt) throw new NotFoundError('Document not found');
  await getAccessibleApplication(document.applicationId, user);
  const bytes = await storage.get(document.storageKey);
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_DOWNLOAD',
    entityType: 'Document',
    entityId: documentId,
    ...(await getRequestMeta()),
  });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.fileName.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
