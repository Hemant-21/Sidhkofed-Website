/**
 * Documents module shared types: the filter/ordering contract used by the controller,
 * service, and repository. Kept framework-free so the repository can build its `where`
 * from a plain object without importing HTTP types.
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for media-usage tracking + audit module name. */
export const DOCUMENT_ENTITY = 'document';

/**
 * Admin list filters. All optional; unknown filters are simply ignored (the repository only
 * reads known keys — it never passes arbitrary client fields to Prisma, coding-standards §6).
 *
 * NOTE: `programme`/`institution` filters land additively with those modules (their junction
 * tables do not exist yet — dependency-graph Tier 7). The currently-backed filters cover the
 * Knowledge Centre contract: document type, knowledge category, commodity, district, financial
 * year, language, date range, year, and keyword search.
 */
export interface DocumentFilters {
  publicationState?: PublicationState;
  documentType?: string; // id or slug
  knowledgeCategory?: string; // id or slug
  knowledgeCentre?: boolean; // show_in_knowledge_centre = true
  commodity?: string; // id or slug
  district?: string; // id or slug
  financialYear?: string; // id or label
  language?: 'en' | 'hi';
  year?: number; // publication_date year
  dateFrom?: Date; // publication_date >=
  dateTo?: Date; // publication_date <=
  search?: string; // metadata keyword (title/description) — FTS-ready seam
}

/** The public predicate is always applied for public reads (visibility + is_public). */
export interface PublicDocumentFilters extends DocumentFilters {
  /** Forces show_in_knowledge_centre=true (the dedicated Knowledge Centre surface). */
  knowledgeCentreOnly?: boolean;
}

/** Allowed ordering fields for admin + public document lists (API spec §5). */
export const DOCUMENT_ORDERING_FIELDS = [
  'publication_date',
  'published_at',
  'title_en',
  'display_order',
  'created_at',
] as const;

export type DocumentOrderingField = (typeof DOCUMENT_ORDERING_FIELDS)[number];
