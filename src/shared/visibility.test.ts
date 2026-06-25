/** Unit tests — shared public-visibility predicate (scheduled-publishing gate). */
import { describe, it, expect } from 'vitest';
import { publicVisibilityWhere } from './visibility';

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
