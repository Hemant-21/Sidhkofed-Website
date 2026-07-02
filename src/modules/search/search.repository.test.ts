/**
 * Unit tests — search repository (Phase 13).
 *   - `buildSurfaceFragments` is pure: surface selection, relational-filter exclusion, and the
 *     public-vs-admin visibility predicate are asserted on the generated SQL/params (DB-free).
 *   - `search` is exercised with a mocked Prisma client to verify the COUNT + page flow, the
 *     short-circuit when no surface can match, and that `take=0` skips the page query.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: { $queryRaw: vi.fn(), mediaAsset: { findMany: vi.fn() } },
}));
vi.mock('@/db/prisma', () => ({ prisma: db }));

import { buildSurfaceFragments, search, tsQuery, type SurfaceContext } from './search.repository';
import { CONTENT_TYPES } from './search.types';

const ctx = (over: Partial<SurfaceContext> = {}): SurfaceContext => ({
  tsq: tsQuery('lac'),
  public: false,
  now: new Date('2026-06-26T00:00:00Z'),
  ...over,
});

/** Readable, placeholder-flattened SQL text for a fragment array. */
const text = (frags: { sql: string }[]): string => frags.map((f) => f.sql).join(' || ');

describe('buildSurfaceFragments — surface selection', () => {
  it('builds one fragment per requested content type when no relational filter is set', () => {
    expect(buildSurfaceFragments([...CONTENT_TYPES], ctx())).toHaveLength(8);
  });

  it('limits surfaces to the requested content types', () => {
    const frags = buildSurfaceFragments(['event', 'document'], ctx());
    expect(frags).toHaveLength(2);
    expect(text(frags)).toContain('FROM events');
    expect(text(frags)).toContain('FROM documents');
  });

  it('drops surfaces that cannot satisfy a commodity filter', () => {
    // commodity is supported by event, programme, document, procurement_update only.
    const frags = buildSurfaceFragments([...CONTENT_TYPES], ctx({ commodity: 'lac' }));
    expect(frags).toHaveLength(4);
    const sql = text(frags);
    expect(sql).toContain('FROM events');
    expect(sql).toContain('FROM programme_schemes');
    expect(sql).toContain('FROM documents');
    expect(sql).toContain('FROM procurement_updates');
    expect(sql).not.toContain('FROM event_news');
    expect(sql).not.toContain('FROM tenders');
    expect(sql).not.toContain('FROM pages');
  });

  it('drops surfaces that cannot satisfy a district filter', () => {
    // district is supported by event, document, procurement_update only.
    const frags = buildSurfaceFragments([...CONTENT_TYPES], ctx({ district: 'gumla' }));
    expect(frags).toHaveLength(3);
    const sql = text(frags);
    expect(sql).toContain('FROM events');
    expect(sql).toContain('FROM documents');
    expect(sql).toContain('FROM procurement_updates');
    expect(sql).not.toContain('FROM programme_schemes');
  });

  it('returns no fragments when a relational filter excludes every requested surface', () => {
    expect(buildSurfaceFragments(['news', 'page'], ctx({ commodity: 'lac' }))).toHaveLength(0);
  });
});

describe('buildSurfaceFragments — visibility predicate', () => {
  it('applies the public predicate (and is_public for documents) for public search', () => {
    const sql = text(buildSurfaceFragments(['event', 'document'], ctx({ public: true })));
    expect(sql).toContain("publication_state = 'published'");
    expect(sql).toContain('public_visibility = true');
    expect(sql).toContain('archived_at IS NULL');
    expect(sql).toContain('is_public = true'); // documents-only flag
  });

  it('gates the programme surface (cover-bearing) by the public predicate so a hidden programme never appears', () => {
    // A hidden programme is excluded from public search entirely → its cover URL is never emitted,
    // keeping Search in agreement with the public Programme + Media endpoints (Phase 13 remediation).
    const frag = buildSurfaceFragments(['programme'], ctx({ public: true }))[0]!;
    expect(frag.sql).toContain("p.publication_state = 'published'");
    expect(frag.sql).toContain('p.public_visibility = true');
    expect(frag.sql).toContain('p.archived_at IS NULL');
    expect(frag.sql).toContain('p.publish_start_at <= ?');
  });

  it('omits the public predicate for admin search (all states)', () => {
    const sql = text(buildSurfaceFragments(['event'], ctx({ public: false })));
    expect(sql).not.toContain("publication_state = 'published'");
  });

  it('binds the query term as a parameter (never interpolated)', () => {
    const frags = buildSurfaceFragments(['event'], ctx());
    expect(frags[0]!.sql).toContain("websearch_to_tsquery('simple', ?)");
    expect(frags[0]!.values).toContain('lac');
  });

  it('binds the year filter as a parameter', () => {
    const frags = buildSurfaceFragments(['event'], ctx({ year: 2026 }));
    expect(frags[0]!.sql).toContain('EXTRACT(YEAR FROM e.start_date) = ?');
    expect(frags[0]!.values).toContain(2026);
  });
});

describe('search', () => {
  beforeEach(() => vi.clearAllMocks());

  it('short-circuits without querying when no surface can match', async () => {
    const res = await search(
      { q: 'lac', contentTypes: ['news'], commodity: 'lac' },
      { skip: 0, take: 20, public: true },
    );
    expect(res).toEqual({ rows: [], total: 0 });
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns total only (no page query) when the count is zero', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ count: 0n }]);
    const res = await search({ q: 'lac', contentTypes: ['event'] }, { skip: 0, take: 20, public: true });
    expect(res).toEqual({ rows: [], total: 0 });
    expect(db.$queryRaw).toHaveBeenCalledTimes(1); // count only
  });

  it('runs COUNT then the ranked page query and returns both', async () => {
    const pageRows = [{ content_type: 'event', id: 'e1', slug: 's', title_en: 'T', title_hi: null, summary: null, publication_date: '2026-02-10', cover_media_id: null, rank: 0.6 }];
    db.$queryRaw.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce(pageRows);
    const res = await search({ q: 'lac', contentTypes: ['event'] }, { skip: 0, take: 20, public: true });
    expect(res.total).toBe(1);
    expect(res.rows).toEqual(pageRows);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
