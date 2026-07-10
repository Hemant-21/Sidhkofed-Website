import { describe, it, expect, beforeEach, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: {
    document: { count: vi.fn() },
    gallery: { count: vi.fn() },
    galleryImage: { count: vi.fn() },
    video: { count: vi.fn() },
    event: { count: vi.fn() },
    eventNews: { count: vi.fn() },
    programmeScheme: { count: vi.fn() },
    toolkit: { count: vi.fn() },
    institution: { count: vi.fn() },
    leadership: { count: vi.fn() },
    commodity: { count: vi.fn() },
    digitalService: { count: vi.fn() },
  },
}));

vi.mock('@/db/prisma', () => ({ prisma: db }));

import { isPubliclyLinked } from './media.repository';

beforeEach(() => {
  vi.clearAllMocks();
  for (const model of Object.values(db)) model.count.mockResolvedValue(0);
});

describe('isPubliclyLinked - Leadership photo', () => {
  it('allows a media asset linked from a published public Leadership record', async () => {
    db.leadership.count.mockResolvedValue(1);

    await expect(isPubliclyLinked('m1')).resolves.toBe(true);
  });

  it('gates Leadership photos on the shared public visibility predicate', async () => {
    await isPubliclyLinked('m1');

    expect(db.leadership.count).toHaveBeenCalledOnce();
    const where = db.leadership.count.mock.calls[0][0].where;
    expect(where.photoMediaId).toBe('m1');
    expect(where.publicationState).toBe('published');
    expect(where.publicVisibility).toBe(true);
    expect(where.archivedAt).toBeNull();
    expect(where.OR).toBeTruthy();
  });
});
