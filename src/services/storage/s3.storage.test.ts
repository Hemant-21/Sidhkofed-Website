import { describe, it, expect, beforeEach, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock('@/config', () => ({
  storageConfig: {
    signedUrlTtlSeconds: 600,
    s3: {
      endpoint: 'https://s3.example.test',
      region: 'us-test-1',
      bucket: 'private-bucket',
      accessKeyId: 'key-id',
      secretAccessKey: 'secret',
      forcePathStyle: true,
    },
  },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({ input, command: 'PutObjectCommand' })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input, command: 'GetObjectCommand' })),
  DeleteObjectCommand: vi.fn().mockImplementation((input) => ({ input, command: 'DeleteObjectCommand' })),
  HeadObjectCommand: vi.fn().mockImplementation((input) => ({ input, command: 'HeadObjectCommand' })),
  HeadBucketCommand: vi.fn().mockImplementation((input) => ({ input, command: 'HeadBucketCommand' })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.test/signed'),
}));

import { AppError } from '@/shared/errors';
import { S3StorageService } from './s3.storage';

describe('S3StorageService object access errors', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('returns null for a missing object during stat', async () => {
    sendMock.mockRejectedValue({ name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });

    await expect(new S3StorageService().stat('media/missing.png')).resolves.toBeNull();
  });

  it('throws an internal storage error for AccessDenied during stat', async () => {
    sendMock.mockRejectedValue({ name: 'AccessDenied', $metadata: { httpStatusCode: 403 } });

    await expect(new S3StorageService().stat('media/private.png')).rejects.toMatchObject({
      code: 'internal_error',
      statusCode: 500,
    } satisfies Partial<AppError>);
  });
});
