import {
  DocumentType,
  InterviewMode,
  PaymentMethod,
  Role,
  ScreeningOutcome,
  Stream,
  TrusteeDecisionType,
} from '@prisma/client';
import { z } from 'zod';
import { config } from './config';

export const otpRequestSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().email().optional(),
});

export const otpVerifySchema = z.object({
  identifier: z.string().trim().min(8),
  code: z.string().trim().regex(/^\d{6}$/),
});

export const childSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  dateOfBirth: z.coerce.date(),
  school: z.string().trim().min(2).max(160),
  grade: z.string().trim().min(1).max(40),
  house: z.string().trim().min(1).max(80).default('Not applicable'),
  gender: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const streamASchema = z.object({
  // No income/salary/employment fields by design.
  circumstances: z.string().trim().max(2000).optional(),
});

export const streamBSchema = z.object({
  sport: z.string().trim().min(2).max(80),
  position: z.string().trim().min(2).max(80),
  level: z.string().trim().min(2).max(80),
  results: z.string().trim().min(2).max(2000),
  recruitingCoachName: z.string().trim().min(2).max(120),
  recruitingCoachPhone: z.string().trim().min(8).max(20),
  recruitingCoachEmail: z.string().trim().email().optional().or(z.literal('')),
  clubOrSchool: z.string().trim().max(160).optional(),
  achievements: z.string().trim().max(2000).optional(),
  coachDeclaration: z.boolean().default(false),
});

export const applicationCreateSchema = z.object({
  stream: z.nativeEnum(Stream),
  child: childSchema,
  guardian: z
    .object({
      addressLine1: z.string().trim().max(200).optional(),
      city: z.string().trim().max(100).optional(),
      district: z.string().trim().max(100).optional(),
      postalCode: z.string().trim().max(20).optional(),
      relationshipToChild: z.string().trim().max(60).optional(),
    })
    .optional(),
  renewalOfId: z.string().uuid().optional(),
});

/** Partial, idempotent payload for the autosave endpoint. */
export const applicationPatchSchema = z
  .object({
    child: childSchema.partial(),
    guardian: z
      .object({
        addressLine1: z.string().trim().max(200).optional(),
        addressLine2: z.string().trim().max(200).optional(),
        city: z.string().trim().max(100).optional(),
        district: z.string().trim().max(100).optional(),
        postalCode: z.string().trim().max(20).optional(),
        altPhone: z.string().trim().max(20).optional(),
        relationshipToChild: z.string().trim().max(60).optional(),
      })
      .optional(),
    streamA: streamASchema.optional(),
    streamB: streamBSchema.partial().optional(),
  })
  .strict();

export const applicationSubmitSchema = z.object({
  detailsComplete: z.literal(true),
  documentsComplete: z.literal(true),
  consentGranted: z.literal(true),
});

export const documentMetaSchema = z.object({
  type: z.nativeEnum(DocumentType),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().positive().max(config.upload.maxBytes),
  checksum: z.string().length(64).optional(),
});

export const infoRequestSchema = z.object({
  message: z.string().trim().min(5).max(2000),
  dueDays: z.number().int().min(1).max(30).optional(),
});

export const infoResponseSchema = z.object({
  response: z.string().trim().min(5).max(4000),
});

export const screeningReviewSchema = z.object({
  checklist: z
    .array(
      z.object({
        key: z.string().min(1),
        passed: z.boolean(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .min(1),
  outcome: z.nativeEnum(ScreeningOutcome),
  notes: z.string().trim().max(4000).optional(),
});

export const scoreSchema = z.object({
  criteria: z
    .array(
      z.object({
        key: z.string().min(1),
        score: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      }),
    )
    .min(1),
  recommendation: z.enum(['RECOMMENDED', 'NOT_RECOMMENDED']),
  comments: z.string().trim().max(4000).optional(),
});

export const trusteeDecisionSchema = z
  .object({
    decision: z.nativeEnum(TrusteeDecisionType),
    approvedAmount: z.number().positive().optional(),
    notes: z.string().trim().max(4000).optional(),
    batchId: z.string().max(80).optional(),
  })
  .refine((value) => value.decision !== 'APPROVE' || (value.approvedAmount ?? 0) > 0, {
    message: 'approvedAmount is required when approving',
    path: ['approvedAmount'],
  });

export const trusteeBatchSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(1).max(100),
  decision: z.nativeEnum(TrusteeDecisionType),
  approvedAmount: z.number().positive().optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const interviewSlotSchema = z.object({
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.number().int().min(1).max(50).default(1),
});

export const interviewSessionSchema = z.object({
  title: z.string().trim().min(2).max(160),
  location: z.string().trim().max(200).optional(),
  mode: z.nativeEnum(InterviewMode).default('IN_PERSON'),
  slots: z.array(interviewSlotSchema).min(1),
});

export const acceptAwardSchema = z.object({
  signatureName: z.string().trim().min(3).max(120),
  signatureDataUrl: z.string().startsWith('data:image/').max(2_000_000).optional(),
  accepted: z.literal(true),
});

export const paymentSchema = z.object({
  instalmentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().min(3).max(120),
  paidAt: z.coerce.date().optional(),
});

export const invoiceSchema = z.object({
  childId: z.string().uuid(),
  invoiceNo: z.string().trim().min(3).max(80),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
});

export const instalmentSchema = z.object({
  awardId: z.string().uuid(),
  sequence: z.number().int().positive(),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  invoiceId: z.string().uuid().optional(),
});

export const userRoleSchema = z.object({
  role: z.nativeEnum(Role),
  isActive: z.boolean().optional(),
});

export const dataRequestSchema = z.object({
  type: z.enum(['ACCESS', 'ERASURE', 'RECTIFICATION', 'PORTABILITY', 'OBJECTION']),
  details: z.string().trim().max(2000).optional(),
});
