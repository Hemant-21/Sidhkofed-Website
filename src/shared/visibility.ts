/**
 * The single public-visibility predicate (remediation — public media visibility).
 *
 * Every public read path (content listings AND the public media endpoint) must apply the SAME
 * rule, so a record scheduled for the future, archived, unpublished, or hidden never leaks —
 * directly or via its attached media. This is the one place the predicate is defined; callers
 * spread it into their Prisma `where` (it is framework-free / returns a plain object, so it
 * composes into any model's `where` that carries the publishing-workflow mixin).
 *
 * Predicate (schema Part 10 / API spec §1.3):
 *   publication_state = published
 *   public_visibility = true
 *   archived_at IS NULL
 *   publish_start_at IS NULL OR publish_start_at <= now   ← scheduled-publishing gate
 *   (+ is_public = true for Documents, which carry an extra public flag)
 */
export interface PublicVisibilityOptions {
  /** Also require `is_public = true` (Documents only). */
  requireIsPublic?: boolean;
  /** Override "now" (tests). Defaults to the current time. */
  now?: Date;
}

/**
 * Build the public-visibility `where` fragment. Returned as a plain object so it can be spread
 * into any mixin-bearing model's `where` (documents, galleries, videos, …) or nested inside a
 * relation `is` filter. The scheduled-publishing window is expressed as an `OR`, so when a
 * caller already has its own top-level `OR` (e.g. keyword search), it must compose this via an
 * `AND` array rather than spreading it (see documents.repository).
 */
export function publicVisibilityWhere(opts: PublicVisibilityOptions = {}): Record<string, unknown> {
  const now = opts.now ?? new Date();
  const where: Record<string, unknown> = {
    publicationState: 'published',
    publicVisibility: true,
    archivedAt: null,
    OR: [{ publishStartAt: null }, { publishStartAt: { lte: now } }],
  };
  if (opts.requireIsPublic) where.isPublic = true;
  return where;
}

/** The publishing-workflow fields needed to evaluate public visibility in application code. */
export interface VisibilityFields {
  publicationState: string;
  publicVisibility: boolean;
  archivedAt: Date | null;
  publishStartAt: Date | null;
  /** Documents carry an extra public flag; only evaluated when `requireIsPublic` is set. */
  isPublic?: boolean | null;
}

/** Options for {@link isPubliclyVisible} — mirrors {@link PublicVisibilityOptions}. */
export interface IsPubliclyVisibleOptions {
  /** Also require `is_public = true` (Documents only). */
  requireIsPublic?: boolean;
  /** Override "now" (tests). Defaults to the current time. */
  now?: Date;
}

/**
 * Application-side companion to {@link publicVisibilityWhere}: returns true when a record (already
 * loaded with its publishing-workflow fields) satisfies the SAME public-visibility predicate. Use
 * this to gate an *embedded* relation a query cannot filter directly (Prisma cannot apply a `where`
 * to an included to-one relation) — e.g. the Programme reference embedded in a public Toolkit, or the
 * Document/Programme linked from a public Communication/Procurement Update — so a draft/archived/
 * future-scheduled/hidden linked record is never surfaced (nor its media URL). Defined alongside the
 * `where` builder so the predicate has a single source of truth.
 *
 * The second argument accepts either a `now` Date (back-compat) or an options object; pass
 * `{ requireIsPublic: true }` to also enforce the Documents-only `is_public` flag.
 */
export function isPubliclyVisible(
  record: VisibilityFields,
  opts: Date | IsPubliclyVisibleOptions = {},
): boolean {
  const o: IsPubliclyVisibleOptions = opts instanceof Date ? { now: opts } : opts;
  const now = o.now ?? new Date();
  const base =
    record.publicationState === 'published' &&
    record.publicVisibility === true &&
    record.archivedAt === null &&
    (record.publishStartAt === null || record.publishStartAt.getTime() <= now.getTime());
  if (!base) return false;
  return o.requireIsPublic ? record.isPublic === true : true;
}
