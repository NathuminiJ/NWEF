import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from './config';
import { prisma } from './db';

const key = Buffer.from(config.pdpaEncryptionKey, 'base64');
if (key.length !== 32) {
  throw new Error('PDPA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
}

/** AES-256-GCM field-level encryption for identifiers and bank details. */
export function encryptPii(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptPii(payload: string): string {
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) throw new Error('Malformed encrypted value');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8');
}

export async function hasValidConsent(userId: string, purpose: string): Promise<boolean> {
  const consent = await prisma.consentRecord.findFirst({
    where: { userId, purpose, withdrawnAt: null },
    orderBy: { grantedAt: 'desc' },
  });
  return Boolean(consent);
}

export async function recordConsent(userId: string, purpose: string, text: string, version: string, ip?: string | null) {
  return prisma.consentRecord.create({ data: { userId, purpose, text, version, ip: ip ?? null } });
}

export async function openDataSubjectRequest(
  userId: string,
  type: 'ACCESS' | 'ERASURE' | 'RECTIFICATION' | 'PORTABILITY' | 'OBJECTION',
  details?: string,
) {
  return prisma.dataSubjectRequest.create({
    data: {
      userId,
      type,
      details,
      dueAt: new Date(Date.now() + 30 * 86_400_000),
    },
  });
}
