/**
 * Unit tests — media public-visibility linkage (Phase 8 remediation Issue 1). Prisma is mocked, so
 * these assert that a PUBLISHED Institution logo now counts as a public owner and that the
 * Institution query is gated by the shared public-visibility predicate.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: {
    document: { count: vi.fn() },
    gallery: { count: vi.fn() },
    galleryImage: { count: vi.fn() },
    video: { count: vi.fn() },
    event: { count: vi.fn() },
    eventNews: { count: vi.fn() },
    institution: { count: vi.fn() },
    commodity: { count: vi.fn() },
  },
}));

vi.mock('@/db/prisma', () => ({ prisma: db }));

import { isPubliclyLinked } from './media.repository';

beforeEach(() => {
  vi.clearAllMocks();
  for (const model of Object.values(db)) model.count.mockResolvedValue(0);
});

describe('isPubliclyLinked — Institution logo (Issue 1)', () => {
  it('returns true when only a published Institution references the asset as its logo', async () => {
    db.institution.count.mockResolvedValue(1);
    expect(await isPubliclyLinked('m1')).toBe(true);
  });

  it('gates the Institution query on logoMediaId + the published public-visibility predicate', async () => {
    await isPubliclyLinked('m1');
    expect(db.institution.count).toHaveBeenCalledOnce();
    const where = db.institution.count.mock.calls[0][0].where;
    expect(where.logoMediaId).toBe('m1');
    expect(where.publicationState).toBe('published');
    expect(where.publicVisibility).toBe(true);
    expect(where.archivedAt).toBeNull();
    // The scheduled-publishing gate is present (publishStartAt null OR <= now).
    expect(where.OR).toBeTruthy();
  });

  it('returns false when no public owner (including no institution) references the asset', async () => {
    expect(await isPubliclyLinked('m1')).toBe(false);
  });
});
