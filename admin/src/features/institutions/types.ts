/**
 * Institutions module types — a faithful mirror of the backend Institution DTOs (institutions.dto.ts)
 * and request validators (institutions.validators.ts). The frontend consumes these contracts
 * exactly; it never invents fields. `snake_case` matches the API transport (API spec §0).
 *
 * One reusable Institution operation for all organisations — partners, departments, universities,
 * NGOs, cooperative bodies, etc. (codex §4.4 / API spec §5). Publishable **P** content carrying the
 * shared publishing-workflow mixin. Authorized with the generic `content.*` RBAC set
 * (institutions.routes.ts), so permission keys are reused from the events feature.
 */

import type { MasterRef, MediaRef, HighlightType, PublicationState } from '@/types/common';

/** Admin list summary (InstitutionSummaryDto). */
export interface InstitutionSummary {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  institution_type: MasterRef;
  district: MasterRef | null;
  logo: MediaRef | null;
  website_url: string | null;
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

/** Admin detail (InstitutionDetailDto). */
export interface InstitutionDetail extends InstitutionSummary {
  description_en: string | null;
  description_hi: string | null;
  address_en: string | null;
  address_hi: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

/**
 * Create/Update body — only the model-backed fields + allowed workflow fields the backend validator
 * accepts (institutions.validators.ts, `.strict()`). Server-managed fields (slug, state, *_by,
 * published_at) are never produced.
 */
export interface InstitutionWriteInput {
  institution_type_id?: string;
  name_en?: string;
  name_hi?: string | null;
  description_en?: string | null;
  description_hi?: string | null;
  address_en?: string | null;
  address_hi?: string | null;
  website_url?: string | null;
  logo_media_id?: string | null;
  district_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
