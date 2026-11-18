import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config';

export interface StorageService {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  signedUrl(key: string, expiresSeconds?: number): Promise<string>;
}

function safeKey(key: string): string {
  if (key.includes('..') || path.isAbsolute(key)) throw new Error('Invalid storage key');
  return key.replace(/\\/g, '/');
}

class LocalStorage implements StorageService {
  private base = path.resolve(process.cwd(), config.storage.localDir);

  private resolve(key: string) {
    const target = path.resolve(this.base, safeKey(key));
    if (!target.startsWith(this.base + path.sep)) throw new Error('Invalid storage key');
    return target;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    await unlink(this.resolve(key)).catch(() => undefined);
  }

  async signedUrl(key: string): Promise<string> {
    return `/api/documents/${encodeURIComponent(key)}`;
  }
}

let s3: S3Client | undefined;

function client(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: config.storage.region,
      endpoint: config.storage.endpoint || undefined,
      forcePathStyle: config.storage.forcePathStyle,
      credentials: config.storage.accessKeyId
        ? { accessKeyId: config.storage.accessKeyId, secretAccessKey: config.storage.secretAccessKey ?? '' }
        : undefined,
    });
  }
  return s3;
}

class S3Storage implements StorageService {
  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await client().send(
      new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: safeKey(key),
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const result = await client().send(new GetObjectCommand({ Bucket: config.storage.bucket, Key: safeKey(key) }));
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async remove(key: string): Promise<void> {
    await client().send(new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: safeKey(key) }));
  }

  async signedUrl(key: string, expiresSeconds = 900): Promise<string> {
    return getSignedUrl(
      client(),
      new GetObjectCommand({ Bucket: config.storage.bucket, Key: safeKey(key) }),
      { expiresIn: expiresSeconds },
    );
  }
}

export const storage: StorageService = config.storage.driver === 's3' ? new S3Storage() : new LocalStorage();
