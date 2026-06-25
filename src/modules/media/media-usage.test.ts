/** Unit tests — media usage tracking (delete-protection bookkeeping). */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: { mediaUsage: { upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn(), count: vi.fn() } },
}));
vi.mock('@/db/prisma', () => ({ prisma: db }));

import { mediaUsageService } from './media-usage.service';

const ref = { mediaId: 'm1', entityType: 'gallery', entityId: 'g1', field: 'image' };

beforeEach(() => vi.clearAllMocks());

describe('media-usage.service', () => {
  it('registers a usage idempotently via the composite unique key', async () => {
    await mediaUsageService.registerUsage(ref);
    const arg = db.mediaUsage.upsert.mock.calls[0][0];
    expect(arg.where.mediaId_entityType_entityId_field).toEqual(ref);
    expect(arg.create).toEqual(ref);
  });

  it('removes a usage', async () => {
    await mediaUsageService.removeUsage(ref);
    expect(db.mediaUsage.deleteMany).toHaveBeenCalledWith({ where: ref });
  });

  it('lists where an asset is used', async () => {
    db.mediaUsage.findMany.mockResolvedValue([{ entityType: 'gallery', entityId: 'g1', field: 'image', createdAt: new Date() }]);
    const used = await mediaUsageService.whereUsed('m1');
    expect(used).toHaveLength(1);
    expect(used[0].entityType).toBe('gallery');
  });

  it('reports usage for delete protection', async () => {
    db.mediaUsage.count.mockResolvedValueOnce(2);
    expect(await mediaUsageService.isUsed('m1')).toBe(true);
    db.mediaUsage.count.mockResolvedValueOnce(0);
    expect(await mediaUsageService.isUsed('m1')).toBe(false);
  });
});
