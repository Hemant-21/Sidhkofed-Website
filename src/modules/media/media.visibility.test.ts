/** Unit tests — public media visibility gate on openFile (remediation Issue 6). */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, storage } = vi.hoisted(() => ({
  repo: { findById: vi.fn(), isPubliclyLinked: vi.fn() },
  storage: { servesThroughApp: true, createReadStream: undefined, get: vi.fn(), getUrl: vi.fn() },
}));

vi.mock('./media.repository', () => ({ mediaRepository: repo }));
vi.mock('@/services/storage', () => ({ storage }));
vi.mock('@/services/redis', () => ({ redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() } }));

import { mediaService } from './media.service';
import { PermissionError, NotFoundError } from '@/shared/errors';

const asset = { id: 'm1', archivedAt: null, mimeType: 'application/pdf', fileName: 'a.pdf', storageKey: 'k', url: '/f' };

beforeEach(() => {
  vi.clearAllMocks();
  storage.get.mockResolvedValue(Buffer.from('x'));
});

describe('mediaService.openFile visibility gate', () => {
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
  });

  it('404s an archived/missing asset before the visibility check', async () => {
    repo.findById.mockResolvedValue({ ...asset, archivedAt: new Date() });
    await expect(mediaService.openFile('m1')).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.isPubliclyLinked).not.toHaveBeenCalled();
  });
});
