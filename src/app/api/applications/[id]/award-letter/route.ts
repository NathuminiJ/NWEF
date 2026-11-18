import { NextResponse } from 'next/server';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { route } from '@/lib/api';
import { generateAwardLetter } from '@/lib/pdf';
import { storage } from '@/lib/storage';
import { getAccessibleApplication } from '@/services/access';

export const runtime = 'nodejs';

export const GET = route(async (_request, context) => {
  const { id } = await context.params;
  const user = await requireUser();
  await getAccessibleApplication(id, user);
  const award = await prisma.award.findUnique({ where: { applicationId: id } });
  if (!award) throw new NotFoundError('Award letter is not available yet');

  const pdf = award.letterKey
    ? await storage.get(award.letterKey)
    : await generateAwardLetter({
        referenceNo: id,
        guardianName: user.fullName,
        childName: 'Scholarship recipient',
        school: 'Trinity College',
        amount: Number(award.amount),
      });

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_DOWNLOAD',
    entityType: 'Award',
    entityId: award.id,
    ...(await getRequestMeta()),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nwef-award-${id}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
