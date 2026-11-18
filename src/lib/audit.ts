import { Prisma, type AuditAction, type Role } from '@prisma/client';
import { config } from './config';
import { prisma } from './db';
import { canonicalStringify, hmac } from './crypto';

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditInput extends RequestMeta {
  actorId?: string | null;
  actorRole?: Role | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only audit trail. There is deliberately no update or delete helper:
 * the database role used by the app should be granted INSERT/SELECT only on
 * AuditLog. Each row is chained to the previous hash to detect tampering.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  const previous = await prisma.auditLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });
  const prevHash = previous?.hash ?? 'GENESIS';
  const createdAt = new Date();
  const body = {
    prevHash,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: createdAt.toISOString(),
  };
  const hash = hmac(config.auditSecret, canonicalStringify(body));

  await prisma.auditLog.create({
    data: {
      ...body,
      createdAt,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      hash,
    },
  });
}

export async function writeAuditBatch(inputs: AuditInput[]): Promise<void> {
  for (const input of inputs) await writeAudit(input);
}

/** Verifies the full chain; useful for compliance exports and integrity checks. */
export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAt?: string }> {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
  let prevHash = 'GENESIS';
  for (const log of logs) {
    const body = canonicalStringify({
      prevHash,
      actorId: log.actorId,
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    });
    if (hmac(config.auditSecret, body) !== log.hash) return { valid: false, brokenAt: log.id };
    prevHash = log.hash;
  }
  return { valid: true };
}
