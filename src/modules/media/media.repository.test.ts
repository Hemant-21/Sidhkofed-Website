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
    programmeScheme: { count: vi.fn() },
    toolkit: { count: vi.fn() },
    institution: { count: vi.fn() },
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

describe('isPubliclyLinked — Digital Service icon (Phase 10 Issue 1)', () => {
  it('returns true when only a published Digital Service references the asset as its icon', async () => {
    db.digitalService.count.mockResolvedValue(1);
    expect(await isPubliclyLinked('m1')).toBe(true);
  });

  it('gates the Digital Service query on iconMediaId + the published public-visibility predicate', async () => {
    await isPubliclyLinked('m1');
    expect(db.digitalService.count).toHaveBeenCalledOnce();
    const where = db.digitalService.count.mock.calls[0][0].where;
    expect(where.iconMediaId).toBe('m1');
    expect(where.publicationState).toBe('published');
    expect(where.publicVisibility).toBe(true);
    expect(where.archivedAt).toBeNull();
    // The scheduled-publishing gate is present (publishStartAt null OR <= now).
    expect(where.OR).toBeTruthy();
  });

  it('returns false when no Digital Service publicly references the asset (draft/archived/hidden/future)', async () => {
    // A draft/archived/hidden/future-scheduled service fails the predicate → count 0 → not linked.
    db.digitalService.count.mockResolvedValue(0);
    expect(await isPubliclyLinked('m1')).toBe(false);
  });
});

describe('isPubliclyLinked — Programme cover (Phase 13 remediation)', () => {
  it('returns true when only a published Programme references the asset as its cover', async () => {
    db.programmeScheme.count.mockResolvedValue(1);
    expect(await isPubliclyLinked('m1')).toBe(true);
  });

  it('gates the Programme query on coverMediaId + the shared published public-visibility predicate', async () => {
    await isPubliclyLinked('m1');
    expect(db.programmeScheme.count).toHaveBeenCalledOnce();
    const where = db.programmeScheme.count.mock.calls[0][0].where;
    expect(where.coverMediaId).toBe('m1');
    expect(where.publicationState).toBe('published');
    expect(where.publicVisibility).toBe(true);
    expect(where.archivedAt).toBeNull();
    // The scheduled-publishing gate is present (publishStartAt null OR <= now) — future covers excluded.
    expect(where.OR).toBeTruthy();
  });

  it('returns false for a draft / archived / future-scheduled Programme cover (predicate → count 0)', async () => {
    // Each non-public state fails the shared predicate, so the gated count is 0 → not linked → 403.
    db.programmeScheme.count.mockResolvedValue(0);
    expect(await isPubliclyLinked('m1')).toBe(false);
  });
});

describe('isPubliclyLinked — Toolkit cover (Phase 13 remediation)', () => {
  it('returns true when only a published Toolkit references the asset as its cover', async () => {
    db.toolkit.count.mockResolvedValue(1);
    expect(await isPubliclyLinked('m1')).toBe(true);
  });

  it('gates the Toolkit query on coverMediaId + the shared published public-visibility predicate', async () => {
    await isPubliclyLinked('m1');
    expect(db.toolkit.count).toHaveBeenCalledOnce();
    const where = db.toolkit.count.mock.calls[0][0].where;
    expect(where.coverMediaId).toBe('m1');
    expect(where.publicationState).toBe('published');
    expect(where.publicVisibility).toBe(true);
    expect(where.archivedAt).toBeNull();
    // The scheduled-publishing gate is present (publishStartAt null OR <= now) — future covers excluded.
    expect(where.OR).toBeTruthy();
  });

  it('returns false for a draft / archived / future-scheduled Toolkit cover (predicate → count 0)', async () => {
    db.toolkit.count.mockResolvedValue(0);
    expect(await isPubliclyLinked('m1')).toBe(false);
  });
});
