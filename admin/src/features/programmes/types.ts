/**
 * Programmes module types — a faithful mirror of the backend Programme DTOs (programmes.dto.ts)
 * and request validators (programmes.validators.ts). The frontend consumes these contracts
 * exactly; it never invents fields. `snake_case` matches the API transport (API spec §0).
 *
 * One reusable ProgrammeScheme master-operation (codex §4.2 / API spec §5). Publishable **P**
 * content carrying the publishing-workflow mixin, with its own module-specific `programmes.*`
 * RBAC keys (programmes.routes.ts).
 *
 * IMPORTANT: the running backend's create/update validator is `.strict()` and the only relation
 * arrays it accepts are `commodity_ids` and `permitted_training_type_ids`. It does NOT accept
 * institution/document/gallery relations or a "programme type" — those are not part of the
 * Programme contract. We match the backend, not the broader spec prose.
 */

import type { MasterRef, MediaRef, HighlightType, PublicationState } from '@/types/common';

/** Admin list summary (ProgrammeSummaryDto). */
export interface ProgrammeSummary {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
  summary_en: string | null;
  funding_source: string | null;
  start_date: string | null;
  end_date: string | null;
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

/** Admin detail (ProgrammeDetailDto). */
export interface ProgrammeDetail extends ProgrammeSummary {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  objectives_en: string | null;
  objectives_hi: string | null;
  eligibility_en: string | null;
  eligibility_hi: string | null;
  benefits_en: string | null;
  benefits_hi: string | null;
  application_process_en: string | null;
  application_process_hi: string | null;
  commodities: MasterRef[];
  permitted_training_types: MasterRef[];
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/**
 * Create/Update body — only the model-backed fields + relation arrays + workflow fields the backend
 * validator accepts (programmes.validators.ts, `.strict()`). Server-managed fields (slug, state,
 * *_by, published_at) are never produced.
 */
export interface ProgrammeWriteInput {
  title_en?: string;
  title_hi?: string | null;
  short_code?: string | null;
  summary_en?: string | null;
  summary_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  objectives_en?: string | null;
  objectives_hi?: string | null;
  eligibility_en?: string | null;
  eligibility_hi?: string | null;
  benefits_en?: string | null;
  benefits_hi?: string | null;
  application_process_en?: string | null;
  application_process_hi?: string | null;
  funding_source?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  cover_media_id?: string | null;
  commodity_ids?: string[];
  permitted_training_type_ids?: string[];
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
