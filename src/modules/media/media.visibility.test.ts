/** Unit tests — public media visibility gate on openFile (remediation Issue 6). */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MediaAsset } from '@prisma/client';

const { repo, storage } = vi.hoisted(() => ({
  repo: { findById: vi.fn(), isPubliclyLinked: vi.fn() },
  storage: { servesThroughApp: true, createReadStream: undefined, get: vi.fn(), getUrl: vi.fn(), stat: vi.fn() },
}));

vi.mock('./media.repository', () => ({ mediaRepository: repo }));
vi.mock('@/services/storage', () => ({ storage }));
vi.mock('@/services/redis', () => ({ redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() } }));

import { mediaService } from './media.service';
import { AppError, PermissionError, NotFoundError } from '@/shared/errors';

const asset = { id: 'm1', archivedAt: null, mimeType: 'application/pdf', fileName: 'a.pdf', storageKey: 'k', url: '/f' };

beforeEach(() => {
  vi.clearAllMocks();
  storage.servesThroughApp = true;
  storage.get.mockResolvedValue(Buffer.from('x'));
  storage.getUrl.mockResolvedValue('https://storage.example/signed');
  // Object exists in storage by default; the missing-object case overrides this per-test.
  storage.stat.mockResolvedValue({ key: 'k', size: 1 });
});

describe('mediaService.openFile visibility gate', () => {
  it('uses a backend-signed storage URL for admin/CMS S3 previews', async () => {
    storage.servesThroughApp = false;

    const dto = await mediaService.toAdminMediaDto({
      id: 'm1',
      url: '/api/v1/public/media/m1/file',
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: BigInt(1),
      width: null,
      height: null,
      title: null,
      altText: null,
      caption: null,
      checksum: null,
      archivedAt: null,
      uploadedById: null,
      storageKey: 'k',
      createdAt: new Date('2026-07-10T00:00:00Z'),
      updatedAt: new Date('2026-07-10T00:00:00Z'),
    } as MediaAsset);

    expect(dto.url).toBe('https://storage.example/signed');
    expect(storage.getUrl).toHaveBeenCalledWith('k');
  });

  it('403s when the asset is not linked to any public content', async () => {
    repo.findById.mockResolvedValue(asset);
    repo.isPubliclyLinked.mockResolvedValue(false);
    await expect(mediaService.openFile('m1')).rejects.toBeInstanceOf(PermissionError);
  });

  it('serves the file when it is linked to published public content', async () => {
    repo.findById.mockResolvedValue(asset);
    repo.isPubliclyLinked.mockResolvedValue(true);
    const delivery = await mediaService.openFile('m1');
    expect(delivery.kind).toBe('buffer');
    if (delivery.kind === 'buffer') expect(delivery.contentLength).toBe(1);
  });

  it('redirects to a backend-signed URL when public media is stored outside the app', async () => {
    storage.servesThroughApp = false;
    repo.findById.mockResolvedValue(asset);
    repo.isPubliclyLinked.mockResolvedValue(true);

    const delivery = await mediaService.openFile('m1');

    expect(delivery).toEqual({ kind: 'redirect', url: 'https://storage.example/signed' });
    expect(storage.getUrl).toHaveBeenCalledWith('k');
  });

  it('404s an archived/missing asset before the visibility check', async () => {
    repo.findById.mockResolvedValue({ ...asset, archivedAt: new Date() });
    await expect(mediaService.openFile('m1')).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.isPubliclyLinked).not.toHaveBeenCalled();
  });

  it('404s (controlled) when the DB row exists but the storage object is missing (round-2 Issue 2)', async () => {
    repo.findById.mockResolvedValue(asset);
    repo.isPubliclyLinked.mockResolvedValue(true);
    storage.stat.mockResolvedValue(null); // object absent from the backing store
    await expect(mediaService.openFile('m1')).rejects.toBeInstanceOf(NotFoundError);
    expect(storage.get).not.toHaveBeenCalled(); // never attempts to read a missing object
  });

  it('propagates storage AccessDenied as a storage failure, not as media visibility denial', async () => {
    const err = new AppError('internal_error', 'Storage object is not accessible.', { expose: false });
    repo.findById.mockResolvedValue(asset);
    repo.isPubliclyLinked.mockResolvedValue(true);
    storage.stat.mockRejectedValue(err);

    await expect(mediaService.openFile('m1')).rejects.toBe(err);
    expect(repo.isPubliclyLinked).toHaveBeenCalledWith('m1');
  });
});
