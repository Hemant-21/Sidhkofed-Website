/**
 * Procurement Updates module shared types — the framework-free filter/ordering contract used by the
 * controller, service, and repository. One operation for all public procurement-related updates:
 * rates, announcements, schedules, centre updates, trade opportunities (CMS requirements §4.8 / API
 * spec §5). INFORMATIONAL ONLY — no procurement transactions, inventory, warehousing, beneficiary or
 * payment data. Rate/date/location fields are conditional (filled only where the type is relevant).
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for audit module name. */
export const PROCUREMENT_UPDATE_ENTITY = 'procurement_update';

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface ProcurementUpdateFilters {
  publicationState?: PublicationState;
  procurementUpdateType?: string; // id or slug
  commodity?: string; // id or slug
  district?: string; // id or slug
  block?: string; // id or slug
  programme?: string; // id or slug
  dateFrom?: Date; // effective_date >= dateFrom
  dateTo?: Date; // effective_date <= dateTo
  year?: number; // effective_date year
  showOnHomepage?: boolean;
  search?: string; // metadata keyword (title/summary/location)
}

/** Allowed ordering fields (API spec §5: `-effective_date,-published_at`). */
export const PROCUREMENT_UPDATE_ORDERING_FIELDS = [
  'effective_date',
  'published_at',
  'display_order',
  'created_at',
] as const;

export type ProcurementUpdateOrderingField = (typeof PROCUREMENT_UPDATE_ORDERING_FIELDS)[number];
