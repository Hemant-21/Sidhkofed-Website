/**
 * Official Communications module shared types — the framework-free filter/ordering contract used by
 * the controller, service, and repository (mirrors documents.types.ts / institutions.types.ts). One
 * operation for notices, circulars, office orders, notifications, advisories, public announcements
 * (CMS requirements §4.6 / API spec §5).
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for audit module name. */
export const OFFICIAL_COMMUNICATION_ENTITY = 'official_communication';

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface OfficialCommunicationFilters {
  publicationState?: PublicationState;
  communicationType?: string; // id or slug
  highlight?: string; // highlight_type value
  year?: number; // issue_date year
  showOnHomepage?: boolean;
  search?: string; // metadata keyword (title/summary/reference number/authority)
}

/** Allowed ordering fields (API spec §5: `-issue_date,-published_at,display_order`). */
export const OFFICIAL_COMMUNICATION_ORDERING_FIELDS = [
  'issue_date',
  'published_at',
  'display_order',
  'created_at',
] as const;

export type OfficialCommunicationOrderingField = (typeof OFFICIAL_COMMUNICATION_ORDERING_FIELDS)[number];
