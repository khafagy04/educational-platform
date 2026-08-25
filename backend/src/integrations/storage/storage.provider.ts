import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';

export type StoredObject = {
  key: string;
  mimeType: string;
  size: number;
};

export type StorageProvider = {
  upload(input: { key: string; body: Buffer; mimeType: string }): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  readSignedDownload(token: string): Promise<{ body: Buffer; mimeType: string } | null>;
};

const assertSafeKey = (key: string): void => {
  if (!/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(key) || key.includes('..')) {
    throw new Error('Unsafe private storage key.');
  }
};

export class LocalStorageProvider implements StorageProvider {
  public constructor(private readonly rootPath: string) {}

  public async upload(input: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<StoredObject> {
    assertSafeKey(input.key);
    const target = path.resolve(this.rootPath, input.key);
    const root = path.resolve(this.rootPath);
    if (!target.startsWith(`${root}${path.sep}`))
      throw new Error('Storage target escaped its root.');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.body, { flag: 'wx' });
    return { key: input.key, mimeType: input.mimeType, size: input.body.length };
  }

  public async delete(key: string): Promise<void> {
    assertSafeKey(key);
    const target = path.resolve(this.rootPath, key);
    const root = path.resolve(this.rootPath);
    if (!target.startsWith(`${root}${path.sep}`))
      throw new Error('Storage target escaped its root.');
    await unlink(target).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    });
  }

  public async createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    assertSafeKey(key);
    const payload = Buffer.from(
      JSON.stringify({ key, expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds }),
    ).toString('base64url');
    const signature = createHmac('sha256', env.JWT_ACCESS_SECRET)
      .update(payload)
      .digest('base64url');
    await Promise.resolve();
    return `${env.API_PUBLIC_URL}/api/v1/private-storage/${payload}.${signature}`;
  }

  public async readSignedDownload(
    token: string,
  ): Promise<{ body: Buffer; mimeType: string } | null> {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = createHmac('sha256', env.JWT_ACCESS_SECRET).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    let parsed: { key?: unknown; expiresAt?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        key?: unknown;
        expiresAt?: unknown;
      };
    } catch {
      return null;
    }
    if (
      typeof parsed.key !== 'string' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    )
      return null;
    assertSafeKey(parsed.key);
    const target = path.resolve(this.rootPath, parsed.key);
    const root = path.resolve(this.rootPath);
    if (!target.startsWith(`${root}${path.sep}`)) return null;
    try {
      return { body: await readFile(target), mimeType: 'application/pdf' };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}

export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  public constructor(
    endpoint: string,
    accessKeyId: string,
    secretAccessKey: string,
    private readonly bucket: string,
  ) {
    this.client = new S3Client({
      endpoint,
      region: 'auto',
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  public async upload(input: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<StoredObject> {
    assertSafeKey(input.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
      }),
    );
    return { key: input.key, mimeType: input.mimeType, size: input.body.length };
  }

  public async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  public createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    assertSafeKey(key);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: 'attachment; filename="certificate.pdf"',
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  public async readSignedDownload(
    _token: string,
  ): Promise<{ body: Buffer; mimeType: string } | null> {
    void _token;
    await Promise.resolve();
    return null;
  }
}

const required = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`${name} is required when STORAGE_PROVIDER=r2.`);
  return value;
};

export const createStorageProvider = (): StorageProvider => {
  if (env.STORAGE_PROVIDER === 'local') return new LocalStorageProvider(env.LOCAL_STORAGE_PATH);
  return new R2StorageProvider(
    required(env.R2_ENDPOINT, 'R2_ENDPOINT'),
    required(env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID'),
    required(env.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY'),
    required(env.R2_BUCKET, 'R2_BUCKET'),
  );
};
