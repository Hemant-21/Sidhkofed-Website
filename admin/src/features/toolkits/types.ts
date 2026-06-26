/**
 * Toolkits module types — a faithful mirror of the backend Toolkit + ToolkitItem + distribution
 * DTOs (toolkits.dto.ts, items/items.dto.ts, toolkit-distributions.dto.ts) and request validators.
 * The frontend consumes these contracts exactly; it never invents fields. `snake_case` matches the
 * API transport (API spec §0).
 *
 * A Toolkit links a Programme/Scheme + Commodity + ordered ToolkitItems (codex §4.3 / API spec §5).
 * Publishable **P** content with its own module-specific `toolkits.*` RBAC; nested items carry
 * `toolkit_items.*` CRUD. Per-event distribution figures are recorded under Events; the toolkit-level
 * distribution summary is a read-only public AGGREGATE (totals are calculated by the backend).
 */

import type { MasterRef, MediaRef, HighlightType, PublicationState } from '@/types/common';

/** Compact programme reference (toolkits.dto.ts → ProgrammeRef). */
export interface ProgrammeRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
}

export type DistributionBasis = 'individual' | 'group';

/** Toolkit catalogue item (items.dto.ts → ToolkitItemDto). */
export interface ToolkitItem {
  id: string;
  toolkit_id: string;
  name_en: string;
  name_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  unit: string | null;
  distribution_basis: DistributionBasis;
  default_quantity_per_unit: number | null;
  default_group_size: number | null;
  quantity_summary: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Admin list summary (ToolkitSummaryDto). */
export interface ToolkitSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  programme: ProgrammeRef | null;
  commodity: MasterRef | null;
  cover_media: MediaRef | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: HighlightType | null;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Admin detail (ToolkitDetailDto) — includes the ordered catalogue items. */
export interface ToolkitDetail extends ToolkitSummary {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  items: ToolkitItem[];
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/**
 * Create/Update body — only the model-backed fields + relation IDs + workflow fields the backend
 * validator accepts (toolkits.validators.ts, `.strict()`). Server-managed fields (slug, state,
 * *_by, published_at) are never produced.
 */
export interface ToolkitWriteInput {
  title_en?: string;
  title_hi?: string | null;
  summary_en?: string | null;
  summary_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  programme_scheme_id?: string | null;
  commodity_id?: string | null;
  cover_media_id?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}

/**
 * Toolkit item create/update body (items.validators.ts, `.strict()`). A `group` basis requires a
 * positive `default_group_size`. Quantities are non-negative decimals; the backend owns any totals.
 */
export interface ToolkitItemWriteInput {
  name_en?: string;
  name_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  unit?: string | null;
  distribution_basis?: DistributionBasis;
  default_quantity_per_unit?: number | null;
  default_group_size?: number | null;
  quantity_summary?: number | null;
  is_active?: boolean;
  display_order?: number;
}

// ── Public distribution aggregate (read-only; backend-calculated totals) ───────────
// `GET /public/toolkits/{slug}/distribution-summary` (toolkit-distributions.dto.ts →
// PublicDistributionSummaryDto). Summary figures only — never beneficiary-level data.

export interface PublicDistributionItemSummary {
  id: string; // toolkit_item_id
  name_en: string;
  name_hi: string | null;
  unit: string | null;
  distribution_basis: string;
  total_quantity: number | null;
}

export interface PublicDistributionSummary {
  toolkit: { id: string; slug: string; title_en: string; title_hi: string | null };
  distribution_model_breakdown: Record<string, number>;
  total_participants_covered: number;
  events_count: number;
  items: PublicDistributionItemSummary[];
  total_quantity: number;
}
