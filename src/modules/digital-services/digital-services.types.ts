/**
 * Digital Services module shared types — the framework-free filter/ordering contract used by the
 * controller, service, and repository. Digital Services are controlled links to APPROVED external
 * systems only (ERP, MIS, membership, beneficiary portal, government portals) — CMS requirements
 * §4.14 / API spec §6. The CMS never simulates, proxies, or embeds those systems.
 */
import type { PublicationState } from '@/shared/publishing';

/** Entity key used for the audit module name and media-usage entityType. */
export const DIGITAL_SERVICE_ENTITY = 'digital_service';

/** Admin/public list filters. All optional; the repository only reads known keys. */
export interface DigitalServiceFilters {
  publicationState?: PublicationState;
  showOnHomepage?: boolean;
  search?: string; // title/description keyword
}

/** Allowed ordering fields (default display order). */
export const DIGITAL_SERVICE_ORDERING_FIELDS = [
  'display_order',
  'title_en',
  'published_at',
  'created_at',
  'updated_at',
] as const;

export type DigitalServiceOrderingField = (typeof DIGITAL_SERVICE_ORDERING_FIELDS)[number];
