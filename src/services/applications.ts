import { randomUUID } from 'node:crypto';
import { Prisma, type ApplicationStatus, type DocumentType, type Stream } from '@prisma/client';
import { ALLOWED_DOCUMENTS } from '@/lib/constants';
import { writeAudit } from '@/lib/audit';
import { getRequestMeta, type AuthUser } from '@/lib/auth/session';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { PERMISSIONS, assertCan } from '@/lib/rbac';
import { storage } from '@/lib/storage';
import { randomToken, sha256 } from '@/lib/crypto';
import { auditView, getAccessibleApplication } from './access';
import { performTransition } from './workflow-service';

function referenceNo(): string {
  return `NWEF-${new Date().getFullYear()}-${randomToken(4).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`;
}

export async function listApplications(
  user: AuthUser,
  filters: { status?: string; stream?: Stream; search?: string } = {},
) {
  const where: Prisma.ApplicationWhereInput = {};
  let allowedStatuses: ApplicationStatus[] | undefined;
  if (user.role === 'APPLICANT') where.guardianId = user.id;
  else if (user.role === 'SCREENING_REVIEWER') {
    allowedStatuses = ['UNDER_SCREENING', 'INFO_REQUESTED', 'SHORTLISTED', 'NOT_ELIGIBLE'];
  } else if (user.role === 'INTERVIEW_PANEL') {
    allowedStatuses = ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'RECOMMENDED', 'NOT_RECOMMENDED'];
  } else if (user.role === 'FINANCE_OFFICER') {
    allowedStatuses = ['TRUSTEE_APPROVED', 'AWARD_ACCEPTED', 'ACTIVE_AWARD', 'ANNUAL_RENEWAL'];
  }
  if (allowedStatuses) {
    const requested = filters.status as ApplicationStatus | undefined;
    const effective = requested ? allowedStatuses.filter((status) => status === requested) : allowedStatuses;
    where.status = { in: effective };
  } else if (filters.status) {
    where.status = filters.status as ApplicationStatus;
  }
  if (filters.stream) where.stream = filters.stream;
  if (filters.search) {
    where.OR = [
      { referenceNo: { contains: filters.search, mode: 'insensitive' } },
      { child: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      { guardian: { fullName: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { child: true, guardian: { select: { fullName: true, phone: true } }, streamA: true, streamB: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.application.count({ where }),
  ]);
  return { items, total };
}

export async function getApplicationDetail(id: string, user: AuthUser) {
  await getAccessibleApplication(id, user);
  await auditView(user, id);
  return prisma.application.findUnique({
    where: { id },
    include: {
      child: true,
      guardian: true,
      streamA: true,
      streamB: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      timeline: { include: { actor: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      infoRequests: { orderBy: { createdAt: 'desc' } },
      screeningReviews: { include: { reviewer: { select: { fullName: true } } }, orderBy: { submittedAt: 'desc' } },
      booking: { include: { slot: { include: { session: true } } } },
      scores: { include: { panelMember: { select: { fullName: true } } } },
      trusteeDecision: true,
      award: { include: { instalments: { orderBy: { sequence: 'asc' } } } },
    },
  });
}

export async function createApplication(
  user: AuthUser,
  input: {
    stream: Stream;
    child: { fullName: string; dateOfBirth: Date; school: string; grade: string; gender?: string; notes?: string };
    guardian?: Record<string, string | undefined>;
    renewalOfId?: string;
  },
) {
  assertCan(user.role, PERMISSIONS.APPLICATION_CREATE);
  const application = await prisma.application.create({
    data: {
      referenceNo: referenceNo(),
      guardian: { connect: { id: user.id } },
      stream: input.stream,
      ...(input.renewalOfId ? { renewalOf: { connect: { id: input.renewalOfId } } } : {}),
      child: { create: { ...input.child, guardian: { connect: { id: user.id } } } },
      streamA: input.stream === 'OLD_TINITIAN_SUPPORT' ? { create: {} } : undefined,
      streamB: input.stream === 'SPORTS_SCHOLARSHIP' ? { create: emptyStreamB() } : undefined,
    },
  });
  if (input.guardian) {
    await prisma.guardianProfile.upsert({
      where: { userId: user.id },
      update: input.guardian as Prisma.GuardianProfileUncheckedUpdateInput,
      create: { userId: user.id, ...(input.guardian as Omit<Prisma.GuardianProfileUncheckedCreateInput, 'userId'>) },
    });
  }
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'CREATE',
    entityType: 'Application',
    entityId: application.id,
    metadata: { stream: input.stream },
    ...(await getRequestMeta()),
  });
  return application;
}

function emptyStreamB() {
  return {
    sport: '',
    position: '',
    level: '',
    results: '',
    recruitingCoachName: '',
    recruitingCoachPhone: '',
  };
}

export async function updateDraft(user: AuthUser, id: string, patch: Record<string, unknown>) {
  const application = await getAccessibleApplication(id, user);
  if (application.status !== 'DRAFT') throw new ConflictError('Only draft applications can be edited');
  assertCan(user.role, PERMISSIONS.APPLICATION_UPDATE_OWN);
  if (application.guardianId !== user.id) throw new ConflictError('Only the owner can edit this draft');

  const child = patch['child'] as Record<string, unknown> | undefined;
  const guardian = patch['guardian'] as Record<string, unknown> | undefined;
  const streamA = patch['streamA'] as Record<string, unknown> | undefined;
  const streamB = patch['streamB'] as Record<string, unknown> | undefined;

  await prisma.$transaction(async (tx) => {
    if (child) await tx.child.update({ where: { id: application.childId }, data: child as Prisma.ChildUncheckedUpdateInput });
    if (guardian) {
      await tx.guardianProfile.upsert({
        where: { userId: user.id },
        update: guardian as Prisma.GuardianProfileUncheckedUpdateInput,
        create: { userId: user.id, ...(guardian as Omit<Prisma.GuardianProfileUncheckedCreateInput, 'userId'>) },
      });
    }
    if (streamA) {
      await tx.streamAData.upsert({
        where: { applicationId: id },
        update: streamA as Prisma.StreamADataUncheckedUpdateInput,
        create: { applicationId: id, ...(streamA as Omit<Prisma.StreamADataUncheckedCreateInput, 'applicationId'>) },
      });
    }
    if (streamB) {
      await tx.streamBData.upsert({
        where: { applicationId: id },
        update: streamB as Prisma.StreamBDataUncheckedUpdateInput,
        create: {
          applicationId: id,
          ...emptyStreamB(),
          ...(streamB as Omit<Prisma.StreamBDataUncheckedCreateInput, 'applicationId'>),
        },
      });
    }
    await tx.application.update({ where: { id }, data: { version: { increment: 1 } } });
  });

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'UPDATE',
    entityType: 'Application',
    entityId: id,
    metadata: { fields: Object.keys(patch) },
    ...(await getRequestMeta()),
  });
  return getApplicationDetail(id, user);
}

export async function submitApplication(user: AuthUser, id: string) {
  await getAccessibleApplication(id, user);
  const docs = await prisma.document.count({ where: { applicationId: id, deletedAt: null } });
  if (docs === 0) throw new BadRequestError('Upload at least one supporting document before submitting');
  return performTransition({
    user,
    applicationId: id,
    to: 'SUBMITTED',
    payload: { detailsComplete: true, documentsComplete: true, consentGranted: true },
  });
}

export async function uploadDocument(
  user: AuthUser,
  id: string,
  file: { fileName: string; mimeType: string; sizeBytes: number; buffer: Buffer },
  meta: { type: DocumentType },
) {
  const application = await getAccessibleApplication(id, user);
  if (application.guardianId !== user.id && user.role !== 'ADMIN_OFFICER') {
    throw new BadRequestError('You cannot upload documents to this application');
  }
  if (!['DRAFT', 'INFO_REQUESTED'].includes(application.status)) {
    throw new ConflictError('Documents can only be added to a draft or an info-requested application');
  }
  if (!ALLOWED_DOCUMENTS[application.stream].includes(meta.type)) {
    throw new BadRequestError(`Document type ${meta.type} is not allowed for ${application.stream}`);
  }
  if (!config.upload.allowedMimeTypes.some((allowed) => allowed === file.mimeType)) {
    throw new BadRequestError('Only PDF, JPG and PNG files are accepted');
  }
  if (file.sizeBytes > config.upload.maxBytes) throw new BadRequestError('Files must be 10MB or smaller');

  const extension = file.mimeType === 'application/pdf' ? 'pdf' : file.mimeType === 'image/png' ? 'png' : 'jpg';
  const storageKey = `${id}/${randomToken(12)}.${extension}`;
  const checksum = sha256(file.buffer);
  await storage.put(storageKey, file.buffer, file.mimeType);
  const document = await prisma.document.create({
    data: {
      applicationId: id,
      type: meta.type,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      storageKey,
      checksum,
      uploadedById: user.id,
    },
  });
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'DOCUMENT_UPLOAD',
    entityType: 'Document',
    entityId: document.id,
    metadata: { applicationId: id, type: meta.type, sizeBytes: file.sizeBytes, checksum },
    ...(await getRequestMeta()),
  });
  return document;
}

export async function deleteDocument(user: AuthUser, applicationId: string, documentId: string) {
  const application = await getAccessibleApplication(applicationId, user);
  const document = await prisma.document.findFirst({ where: { id: documentId, applicationId } });
  if (!document) throw new NotFoundError('Document not found');
  if (application.status !== 'DRAFT' || application.guardianId !== user.id) {
    throw new ConflictError('This document can no longer be removed');
  }
  await prisma.document.update({ where: { id: documentId }, data: { deletedAt: new Date() } });
  await storage.remove(document.storageKey);
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'DELETE',
    entityType: 'Document',
    entityId: documentId,
    ...(await getRequestMeta()),
  });
}

export async function requestInfo(user: AuthUser, id: string, message: string, dueDays?: number) {
  const requestId = randomUUID();
  return performTransition({
    user,
    applicationId: id,
    to: 'INFO_REQUESTED',
    payload: { message, dueDays },
    reason: message,
    sideEffects: async (tx, application, now) => {
      await tx.infoRequest.create({
        data: {
          id: requestId,
          applicationId: application.id,
          requestedById: user.id,
          message,
          dueAt: dueDays ? new Date(now.getTime() + dueDays * 86_400_000) : null,
        },
      });
    },
  });
}

export async function respondInfo(user: AuthUser, id: string, response: string) {
  return performTransition({
    user,
    applicationId: id,
    to: 'UNDER_SCREENING',
    payload: { response },
    sideEffects: async (tx, application, now) => {
      const open = await tx.infoRequest.findFirst({
        where: { applicationId: application.id, respondedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (!open) throw new NotFoundError('No open information request');
      await tx.infoRequest.update({
        where: { id: open.id },
        data: { response, respondedAt: now },
      });
    },
  });
}

export async function bookInterview(user: AuthUser, id: string, slotId: string) {
  assertCan(user.role, PERMISSIONS.APPLICATION_BOOK_INTERVIEW_OWN);
  const bookingId = randomUUID();
  return performTransition({
    user,
    applicationId: id,
    to: 'INTERVIEW_SCHEDULED',
    payload: { bookingId, slotId },
    sideEffects: async (tx, application) => {
      const slot = await tx.interviewSlot.findUnique({ where: { id: slotId } });
      if (!slot || slot.startsAt.getTime() <= Date.now()) throw new BadRequestError('Selected interview slot is unavailable');
      const booked = await tx.interviewBooking.count({ where: { slotId } });
      if (booked >= slot.capacity) throw new ConflictError('Selected interview slot is full');
      await tx.interviewBooking.create({ data: { id: bookingId, applicationId: application.id, slotId } });
    },
  });
}

export async function acceptAward(
  user: AuthUser,
  id: string,
  input: { signatureName: string; signatureDataUrl?: string; accepted: true },
) {
  await getAccessibleApplication(id, user);
  const award = await prisma.award.findUnique({ where: { applicationId: id } });
  if (!award) throw new NotFoundError('Award letter has not been generated yet');
  const { getRequestMeta: meta } = await import('@/lib/auth/session');
  const requestMeta = await meta();
  return performTransition({
    user,
    applicationId: id,
    to: 'AWARD_ACCEPTED',
    payload: input as unknown as Record<string, unknown>,
    sideEffects: async (tx) => {
      await tx.award.update({
        where: { applicationId: id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedById: user.id,
          signatureName: input.signatureName,
          signatureDataUrl: input.signatureDataUrl,
          signatureIp: requestMeta.ip,
        },
      });
      await tx.consentRecord.create({
        data: {
          userId: user.id,
          purpose: 'award_acceptance',
          version: '1.0',
          text: `Electronic acceptance of award by ${input.signatureName}`,
          ip: requestMeta.ip ?? null,
        },
      });
    },
  });
}

export async function createRenewal(user: AuthUser, id: string) {
  const current = await getAccessibleApplication(id, user);
  if (current.status !== 'ACTIVE_AWARD') throw new ConflictError('Only active awards can be renewed');
  const renewal = await prisma.application.create({
    data: {
      referenceNo: referenceNo(),
      guardianId: current.guardianId,
      childId: current.childId,
      stream: current.stream,
      renewalOfId: current.id,
      streamA: current.stream === 'OLD_TINITIAN_SUPPORT' ? { create: {} } : undefined,
      streamB: current.stream === 'SPORTS_SCHOLARSHIP' ? { create: { ...emptyStreamB() } } : undefined,
    },
  });
  await performTransition({
    user,
    applicationId: id,
    to: 'ANNUAL_RENEWAL',
    payload: { renewalApplicationId: renewal.id },
    reason: `Renewal application ${renewal.referenceNo} opened`,
  });
  return renewal;
}
