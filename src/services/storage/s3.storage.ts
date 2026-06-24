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
import type {
  PutObjectInput,
  PutObjectResult,
  SignedUrlOptions,
  StorageService,
} from './storage.types';

const storeLog = logger.child({ component: 'storage', driver: 's3' });

export class S3StorageService implements StorageService {
  readonly provider = 's3' as const;
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

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Empty object body for key ${key}`);
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: options?.expiresInSeconds ?? storageConfig.signedUrlTtlSeconds,
    });
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
