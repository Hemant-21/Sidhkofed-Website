/**
 * Search repository — the ONLY Prisma caller for the search module (foundation 04-coding-standards §6).
 *
 * Implements PostgreSQL metadata full-text search (api-specification.md §1.5/§5/§14):
 *   - Each searchable surface contributes a SELECT over its `search_vector` GIN index, matched with
 *     `websearch_to_tsquery('simple', $q)` (injection-safe: the term is always a bound parameter, and
 *     `websearch_to_tsquery` tolerates arbitrary user punctuation/operators without erroring).
 *   - The fragments are combined with `UNION ALL`, ranked with `ts_rank`, and paginated with
 *     LIMIT/OFFSET — a single indexed query, no per-surface round-trips, no N+1, no full-entity loads.
 *   - Relational filters (`commodity` / `district` / `programme`) are applied as `EXISTS` sub-queries
 *     on the surfaces that support them; a surface that cannot satisfy a supplied relational filter is
 *     excluded entirely (it can never match). `year` filters each surface's natural publication date.
 *   - Public search applies the shared visibility predicate per surface (published + visible + not
 *     archived + due, plus `is_public` for documents); admin search omits it (all states, all surfaces).
 *
 * `search_vector` is a generated column kept out of the Prisma models (foundation §3), so it is only
 * reachable through this parameterized `$queryRaw`. Raw SQL is permitted here for exactly this reason.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { MediaRef } from '@/modules/institutions/institutions.dto';
import type { ContentType, SearchFilters } from './search.types';

/** One ranked, lightweight search hit as returned by the raw query (pre media-resolution). */
export interface SearchRow {
  content_type: ContentType;
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary: string | null;
  publication_date: string | null;
  cover_media_id: string | null;
  rank: number;
}

/** Context threaded into every surface fragment builder. */
export interface SurfaceContext {
  /** The bound `websearch_to_tsquery('simple', $q)` expression (reused for match + rank). */
  tsq: Prisma.Sql;
  /** Apply the public visibility predicate (false for admin search). */
  public: boolean;
  /** "Now" for the scheduled-publishing gate. */
  now: Date;
  commodity?: string;
  district?: string;
  programme?: string;
  year?: number;
}

/** Public visibility predicate for a surface alias (shared rule — visibility.ts, expressed in SQL). */
function publicPredicate(alias: string, now: Date, requireIsPublic = false): Prisma.Sql {
  const a = Prisma.raw(alias); // alias is a hard-coded constant, never user input
  const core = Prisma.sql`${a}.publication_state = 'published' AND ${a}.public_visibility = true AND ${a}.archived_at IS NULL AND (${a}.publish_start_at IS NULL OR ${a}.publish_start_at <= ${now})`;
  return requireIsPublic ? Prisma.sql`${core} AND ${a}.is_public = true` : core;
}

/** Match a master row by UUID or slug (the project-wide id-or-slug convention). */
function idOrSlug(alias: string, value: string): Prisma.Sql {
  const a = Prisma.raw(alias);
  return Prisma.sql`(${a}.id::text = ${value} OR ${a}.slug = ${value})`;
}

// ── Per-surface fragment builders ─────────────────────────────────────────────────────────────────
// Each returns a complete SELECT projecting the unified result columns, or `null` when a supplied
// relational filter cannot apply to that surface (so it is dropped from the UNION).

function eventFragment(c: SurfaceContext): Prisma.Sql | null {
  const conds: Prisma.Sql[] = [Prisma.sql`e.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('e', c.now));
  if (c.commodity)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM event_commodities ec JOIN commodities cm ON cm.id = ec.commodity_id WHERE ec.event_id = e.id AND ${idOrSlug('cm', c.commodity)})`);
  if (c.district)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM districts ds WHERE ds.id = e.district_id AND ${idOrSlug('ds', c.district)})`);
  if (c.programme)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM event_programmes ep JOIN programme_schemes ps ON ps.id = ep.programme_scheme_id WHERE ep.event_id = e.id AND ${idOrSlug('ps', c.programme)})`);
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM e.start_date) = ${c.year}`);
  return Prisma.sql`SELECT 'event'::text AS content_type, e.id::text AS id, e.slug AS slug, e.title_en AS title_en, e.title_hi AS title_hi, e.summary_en AS summary, e.start_date::date::text AS publication_date, e.cover_media_id::text AS cover_media_id, ts_rank(e.search_vector, ${c.tsq}) AS rank FROM events e WHERE ${Prisma.join(conds, ' AND ')}`;
}

function newsFragment(c: SurfaceContext): Prisma.Sql | null {
  // News carries no commodity/district/programme relations → excluded when any is requested.
  if (c.commodity || c.district || c.programme) return null;
  const conds: Prisma.Sql[] = [Prisma.sql`n.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('n', c.now));
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM n.news_published_at) = ${c.year}`);
  return Prisma.sql`SELECT 'news'::text AS content_type, n.id::text AS id, n.slug AS slug, n.title_en AS title_en, n.title_hi AS title_hi, n.summary_en AS summary, n.news_published_at::date::text AS publication_date, n.cover_media_id::text AS cover_media_id, ts_rank(n.search_vector, ${c.tsq}) AS rank FROM event_news n WHERE ${Prisma.join(conds, ' AND ')}`;
}

function programmeFragment(c: SurfaceContext): Prisma.Sql | null {
  // Programmes link commodities, but not districts; "programme" filter is not self-referential.
  if (c.district || c.programme) return null;
  const conds: Prisma.Sql[] = [Prisma.sql`p.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('p', c.now));
  if (c.commodity)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM programme_commodities pc JOIN commodities cm ON cm.id = pc.commodity_id WHERE pc.programme_scheme_id = p.id AND ${idOrSlug('cm', c.commodity)})`);
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM p.start_date) = ${c.year}`);
  return Prisma.sql`SELECT 'programme'::text AS content_type, p.id::text AS id, p.slug AS slug, p.title_en AS title_en, p.title_hi AS title_hi, p.summary_en AS summary, p.start_date::date::text AS publication_date, p.cover_media_id::text AS cover_media_id, ts_rank(p.search_vector, ${c.tsq}) AS rank FROM programme_schemes p WHERE ${Prisma.join(conds, ' AND ')}`;
}

function documentFragment(c: SurfaceContext): Prisma.Sql | null {
  const conds: Prisma.Sql[] = [Prisma.sql`d.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('d', c.now, /* requireIsPublic */ true));
  if (c.commodity)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM document_commodities dc JOIN commodities cm ON cm.id = dc.commodity_id WHERE dc.document_id = d.id AND ${idOrSlug('cm', c.commodity)})`);
  if (c.district)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM document_districts dd JOIN districts ds ON ds.id = dd.district_id WHERE dd.document_id = d.id AND ${idOrSlug('ds', c.district)})`);
  if (c.programme)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM document_programmes dp JOIN programme_schemes ps ON ps.id = dp.programme_scheme_id WHERE dp.document_id = d.id AND ${idOrSlug('ps', c.programme)})`);
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM d.publication_date) = ${c.year}`);
  return Prisma.sql`SELECT 'document'::text AS content_type, d.id::text AS id, d.slug AS slug, d.title_en AS title_en, d.title_hi AS title_hi, d.description_en AS summary, d.publication_date::date::text AS publication_date, NULL::text AS cover_media_id, ts_rank(d.search_vector, ${c.tsq}) AS rank FROM documents d WHERE ${Prisma.join(conds, ' AND ')}`;
}

function communicationFragment(c: SurfaceContext): Prisma.Sql | null {
  if (c.commodity || c.district || c.programme) return null;
  const conds: Prisma.Sql[] = [Prisma.sql`oc.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('oc', c.now));
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM oc.issue_date) = ${c.year}`);
  return Prisma.sql`SELECT 'official_communication'::text AS content_type, oc.id::text AS id, oc.slug AS slug, oc.title_en AS title_en, oc.title_hi AS title_hi, oc.summary_en AS summary, oc.issue_date::date::text AS publication_date, NULL::text AS cover_media_id, ts_rank(oc.search_vector, ${c.tsq}) AS rank FROM official_communications oc WHERE ${Prisma.join(conds, ' AND ')}`;
}

function tenderFragment(c: SurfaceContext): Prisma.Sql | null {
  if (c.commodity || c.district || c.programme) return null;
  const conds: Prisma.Sql[] = [Prisma.sql`t.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('t', c.now));
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM t.publish_date) = ${c.year}`);
  return Prisma.sql`SELECT 'tender'::text AS content_type, t.id::text AS id, t.slug AS slug, t.title_en AS title_en, t.title_hi AS title_hi, t.summary_en AS summary, t.publish_date::date::text AS publication_date, NULL::text AS cover_media_id, ts_rank(t.search_vector, ${c.tsq}) AS rank FROM tenders t WHERE ${Prisma.join(conds, ' AND ')}`;
}

function procurementFragment(c: SurfaceContext): Prisma.Sql | null {
  const conds: Prisma.Sql[] = [Prisma.sql`pu.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('pu', c.now));
  if (c.commodity)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM commodities cm WHERE cm.id = pu.commodity_id AND ${idOrSlug('cm', c.commodity)})`);
  if (c.district)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM districts ds WHERE ds.id = pu.district_id AND ${idOrSlug('ds', c.district)})`);
  if (c.programme)
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM programme_schemes ps WHERE ps.id = pu.programme_scheme_id AND ${idOrSlug('ps', c.programme)})`);
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM pu.effective_date) = ${c.year}`);
  return Prisma.sql`SELECT 'procurement_update'::text AS content_type, pu.id::text AS id, pu.slug AS slug, pu.title_en AS title_en, pu.title_hi AS title_hi, pu.summary_en AS summary, pu.effective_date::date::text AS publication_date, NULL::text AS cover_media_id, ts_rank(pu.search_vector, ${c.tsq}) AS rank FROM procurement_updates pu WHERE ${Prisma.join(conds, ' AND ')}`;
}

function pageFragment(c: SurfaceContext): Prisma.Sql | null {
  if (c.commodity || c.district || c.programme) return null;
  const conds: Prisma.Sql[] = [Prisma.sql`pg.search_vector @@ ${c.tsq}`];
  if (c.public) conds.push(publicPredicate('pg', c.now));
  if (c.year) conds.push(Prisma.sql`EXTRACT(YEAR FROM pg.published_at) = ${c.year}`);
  return Prisma.sql`SELECT 'page'::text AS content_type, pg.id::text AS id, pg.slug AS slug, pg.title_en AS title_en, pg.title_hi AS title_hi, pg.meta_description_en AS summary, pg.published_at::date::text AS publication_date, NULL::text AS cover_media_id, ts_rank(pg.search_vector, ${c.tsq}) AS rank FROM pages pg WHERE ${Prisma.join(conds, ' AND ')}`;
}

const SURFACE_BUILDERS: Record<ContentType, (c: SurfaceContext) => Prisma.Sql | null> = {
  event: eventFragment,
  news: newsFragment,
  programme: programmeFragment,
  document: documentFragment,
  official_communication: communicationFragment,
  tender: tenderFragment,
  procurement_update: procurementFragment,
  page: pageFragment,
};

/**
 * Build the (non-empty) list of surface SELECT fragments for the requested content types and context.
 * Surfaces that cannot satisfy a supplied relational filter are omitted. Pure + DB-free → unit-tested.
 */
export function buildSurfaceFragments(types: ContentType[], ctx: SurfaceContext): Prisma.Sql[] {
  return types
    .map((t) => SURFACE_BUILDERS[t](ctx))
    .filter((frag): frag is Prisma.Sql => frag !== null);
}

/** Build the shared `websearch_to_tsquery` expression for a query term. */
export function tsQuery(q: string): Prisma.Sql {
  return Prisma.sql`websearch_to_tsquery('simple', ${q})`;
}

/**
 * Run the ranked, paginated metadata search. Returns the page rows plus the total match count (for
 * the pagination envelope). A single COUNT + a single page query — no table scans (GIN), no N+1.
 */
export async function search(
  f: SearchFilters,
  opts: { skip: number; take: number; public: boolean; now?: Date },
): Promise<{ rows: SearchRow[]; total: number }> {
  const ctx: SurfaceContext = {
    tsq: tsQuery(f.q),
    public: opts.public,
    now: opts.now ?? new Date(),
    commodity: f.commodity,
    district: f.district,
    programme: f.programme,
    year: f.year,
  };

  const fragments = buildSurfaceFragments(f.contentTypes, ctx);
  if (fragments.length === 0) return { rows: [], total: 0 };

  const union = Prisma.join(fragments, ' UNION ALL ');

  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`SELECT COUNT(*)::bigint AS count FROM (${union}) AS u`,
  );
  const total = Number(countRows[0]?.count ?? 0n);
  if (total === 0 || opts.take === 0) return { rows: [], total };

  const rows = await prisma.$queryRaw<SearchRow[]>(
    Prisma.sql`SELECT u.content_type, u.id, u.slug, u.title_en, u.title_hi, u.summary, u.publication_date, u.cover_media_id, u.rank
               FROM (${union}) AS u
               ORDER BY u.rank DESC, u.publication_date DESC NULLS LAST, u.id ASC
               LIMIT ${opts.take} OFFSET ${opts.skip}`,
  );
  return { rows, total };
}

/**
 * Resolve the compact media references for a set of cover-media ids in ONE query (no N+1). Returns a
 * map keyed by media id; ids with no live asset are simply absent. Kept in the repository so all
 * Prisma access for the module stays here (layering rule).
 */
export async function findCoverMediaRefs(ids: string[]): Promise<Map<string, MediaRef>> {
  const map = new Map<string, MediaRef>();
  if (ids.length === 0) return map;
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: ids } },
    select: { id: true, url: true, fileName: true, mimeType: true, title: true, altText: true, caption: true, width: true, height: true },
  });
  for (const a of assets) {
    map.set(a.id, {
      id: a.id,
      url: a.url,
      file_name: a.fileName,
      mime_type: a.mimeType,
      title: a.title,
      alt_text: a.altText,
      caption: a.caption,
      width: a.width,
      height: a.height,
    });
  }
  return map;
}

export const searchRepository = {
  search,
  findCoverMediaRefs,
  buildSurfaceFragments,
  tsQuery,
};
