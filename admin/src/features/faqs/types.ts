/**
 * FAQs module types — mirror of the backend DTOs and validators (faqs.dto.ts / faqs.validators.ts).
 * FAQs reuse the FAQ Category master (codex §4.13 / API spec §6). Publishable **P** content carrying
 * the publishing-workflow mixin, authorized with the shared `content.*` RBAC keys.
 *
 * `faq_category_id` is optional (FAQs may be uncategorised). `question_en`/`answer_en` are required.
 * Server-managed fields (slug, state, *_by, published_at) are never produced by the client.
 */

import type { MasterRef, HighlightType, PublicationState } from '@/types/common';

/** Admin list summary. */
export interface FaqSummary {
  id: string;
  slug: string;
  question_en: string;
  question_hi: string | null;
  faq_category: MasterRef | null;
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

/** Admin detail — all fields including the answer. */
export interface FaqDetail extends FaqSummary {
  answer_en: string;
  answer_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Write payload — model-backed fields + workflow fields the backend validator accepts
 * (faqs.validators.ts `baseShape` + `workflowShape`). Nothing else.
 */
export interface FaqWriteInput {
  faq_category_id?: string | null;
  question_en?: string;
  question_hi?: string | null;
  answer_en?: string;
  answer_hi?: string | null;
  // workflow
  public_visibility?: boolean;
  publish_start_at?: string | null;
  highlight_type?: HighlightType | null;
  highlight_start_at?: string | null;
  highlight_end_at?: string | null;
  display_order?: number | null;
  show_on_homepage?: boolean;
}
