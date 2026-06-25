/**
 * Tenders module shared types — the framework-free filter/ordering contract used by the controller,
 * service, and repository. Tender Management stores only lightweight structured metadata + the
 * external GeM link (CMS requirements §4.7 / API spec §5). BOQ, corrigenda, clarifications, award/
 * cancellation notices, tender files and bid data stay on GeM — never in the CMS.
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for audit module name. */
export const TENDER_ENTITY = 'tender';

/** Tender status (metadata only — API spec §6: open | closed | cancelled | awarded). */
export const TENDER_STATUSES = ['open', 'closed', 'cancelled', 'awarded'] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface TenderFilters {
  publicationState?: PublicationState;
  tenderType?: string; // id or slug
  tenderStatus?: TenderStatus;
  year?: number; // publish_date year
  showOnHomepage?: boolean;
  search?: string; // metadata keyword (title/summary/tender number/authority)
}

/** Allowed ordering fields (API spec §5: `-submission_deadline,-publish_date`). */
export const TENDER_ORDERING_FIELDS = [
  'submission_deadline',
  'publish_date',
  'published_at',
  'display_order',
  'created_at',
] as const;

export type TenderOrderingField = (typeof TENDER_ORDERING_FIELDS)[number];
