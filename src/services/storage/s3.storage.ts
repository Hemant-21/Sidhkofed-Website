/**
 * S3-compatible object storage driver (AWS S3, MinIO, Cloudflare R2, etc.).
 *
 * Objects are private; delivery uses time-limited signed GET URLs derived from
 * SIGNED_URL_TTL_SECONDS. Configured via the S3_* env group; `S3_ENDPOINT` +
 * `S3_FORCE_PATH_STYLE` support non-AWS providers.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from '@/config';
import { logger } from '@/shared/logger';
import { AppError, NotFoundError } from '@/shared/errors';
import type {
  ObjectMetadata,
  PutObjectInput,
  PutObjectResult,
  SignedUrlOptions,
  StorageService,
} from './storage.types';

const storeLog = logger.child({ component: 'storage', driver: 's3' });

/** True when an S3 error denotes a missing object (NoSuchKey / NotFound / HTTP 404). */
function isMissingObjectError(err: unknown): boolean {
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } } | null;
  return (
    e?.name === 'NoSuchKey' ||
    e?.name === 'NotFound' ||
    e?.Code === 'NoSuchKey' ||
    e?.$metadata?.httpStatusCode === 404
  );
}

/** True when credentials or bucket policy deny the object operation. */
function isAccessDeniedError(err: unknown): boolean {
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } } | null;
  return e?.name === 'AccessDenied' || e?.Code === 'AccessDenied' || e?.$metadata?.httpStatusCode === 403;
}

function storageAccessError(err: unknown): AppError {
  return new AppError('internal_error', 'Storage object is not accessible.', { expose: false, cause: err });
}

export class S3StorageService implements StorageService {
  readonly provider = 's3' as const;
  /** S3 delivers via time-limited signed URLs (redirect), not through the app (Issue 2). */
  readonly servesThroughApp = false;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const { s3 } = storageConfig;
    if (!s3.bucket || !s3.region || !s3.accessKeyId || !s3.secretAccessKey) {
      // Guarded by config validation, but assert for type-narrowing + safety.
      throw new Error('S3 storage selected but S3_* configuration is incomplete');
    }
    this.bucket = s3.bucket;
    this.client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint,
      forcePathStyle: s3.forcePathStyle,
      credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
    });
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const body = typeof input.body === 'string' ? Buffer.from(input.body) : Buffer.from(input.body);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: body,
        ContentType: input.contentType,
        ChecksumSHA256: undefined,
        Metadata: input.checksum ? { checksum: input.checksum } : undefined,
      }),
    );
    return { key: input.key, size: body.byteLength };
  }

  /** Overwrite the object at the same key (S3 PUT is last-writer-wins). */
  async replace(input: PutObjectInput): Promise<PutObjectResult> {
    return this.put(input);
  }

  async get(key: string): Promise<Buffer> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) throw new NotFoundError('Storage object not found.');
      return Buffer.from(bytes);
    } catch (err) {
      // A missing object (NoSuchKey / 404) is a controlled 404, never a leaked 500 (round-2 Issue 2).
      if (isMissingObjectError(err)) throw new NotFoundError('Storage object not found.');
      if (isAccessDeniedError(err)) throw storageAccessError(err);
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      if (isMissingObjectError(err)) return false;
      if (isAccessDeniedError(err)) throw storageAccessError(err);
      return false;
    }
  }

  async stat(key: string): Promise<ObjectMetadata | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        key,
        size: Number(head.ContentLength ?? 0),
        contentType: head.ContentType,
        lastModified: head.LastModified,
      };
    } catch (err) {
      if (isMissingObjectError(err)) return null;
      if (isAccessDeniedError(err)) throw storageAccessError(err);
      storeLog.error({ err, key }, 'S3 object stat failed');
      return null;
    }
  }

  async getUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: options?.expiresInSeconds ?? storageConfig.signedUrlTtlSeconds,
    });
  }

  /** Alias of getUrl for the TASK 4 `getPublicUrl` vocabulary. */
  getPublicUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    return this.getUrl(key, options);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (err) {
      storeLog.error({ err }, 'S3 storage health check failed');
      return false;
    }
  }
}
