/** Unit tests — shared public-visibility predicate (scheduled-publishing gate). */
import { describe, it, expect } from 'vitest';
import { publicVisibilityWhere, isPubliclyVisible, type VisibilityFields } from './visibility';

describe('publicVisibilityWhere', () => {
  it('requires published + public + not archived + publish window', () => {
    const now = new Date('2026-06-25T00:00:00Z');
    const where = publicVisibilityWhere({ now });
    expect(where.publicationState).toBe('published');
    expect(where.publicVisibility).toBe(true);
    expect(where.archivedAt).toBeNull();
    // scheduled-publishing gate: publish_start_at IS NULL OR <= now
    expect(where.OR).toEqual([{ publishStartAt: null }, { publishStartAt: { lte: now } }]);
  });

  it('omits is_public unless requested (galleries/videos)', () => {
    expect(publicVisibilityWhere()).not.toHaveProperty('isPublic');
  });

  it('adds is_public when required (documents)', () => {
    expect(publicVisibilityWhere({ requireIsPublic: true }).isPublic).toBe(true);
  });

  it('uses the current time by default for the publish window', () => {
    const before = Date.now();
    const where = publicVisibilityWhere();
    const lte = (where.OR as Array<{ publishStartAt?: { lte?: Date } }>)[1].publishStartAt?.lte as Date;
    expect(lte.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe('isPubliclyVisible', () => {
  const now = new Date('2026-06-25T00:00:00Z');
  const base: VisibilityFields = {
    publicationState: 'published',
    publicVisibility: true,
    archivedAt: null,
    publishStartAt: null,
  };

  it('passes a published, visible, non-archived, due record', () => {
    expect(isPubliclyVisible(base, now)).toBe(true);
    expect(isPubliclyVisible({ ...base, publishStartAt: new Date('2026-06-01T00:00:00Z') }, now)).toBe(true);
  });

  it('rejects draft / unpublished / archived state', () => {
    expect(isPubliclyVisible({ ...base, publicationState: 'draft' }, now)).toBe(false);
    expect(isPubliclyVisible({ ...base, publicationState: 'unpublished' }, now)).toBe(false);
    expect(isPubliclyVisible({ ...base, publicationState: 'archived' }, now)).toBe(false);
  });

  it('rejects public_visibility=false, archived, or a future publish window', () => {
    expect(isPubliclyVisible({ ...base, publicVisibility: false }, now)).toBe(false);
    expect(isPubliclyVisible({ ...base, archivedAt: new Date('2026-06-20T00:00:00Z') }, now)).toBe(false);
    expect(isPubliclyVisible({ ...base, publishStartAt: new Date('2026-12-01T00:00:00Z') }, now)).toBe(false);
  });

  it('accepts an options object equivalently to a bare Date', () => {
    expect(isPubliclyVisible(base, { now })).toBe(true);
  });

  it('enforces is_public only when requireIsPublic is set (documents)', () => {
    // Without the flag, is_public is ignored.
    expect(isPubliclyVisible({ ...base, isPublic: false }, { now })).toBe(true);
    // With the flag, is_public=false (or missing) fails; true passes.
    expect(isPubliclyVisible({ ...base, isPublic: false }, { now, requireIsPublic: true })).toBe(false);
    expect(isPubliclyVisible(base, { now, requireIsPublic: true })).toBe(false);
    expect(isPubliclyVisible({ ...base, isPublic: true }, { now, requireIsPublic: true })).toBe(true);
  });
});
