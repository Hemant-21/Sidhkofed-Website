/**
 * FAQ DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary, public detail. FAQs carry a
 * full answer in every shape (they are short Q&A records), so the public list returns answers too.
 * Public responses never expose `created_by`/`updated_by`.
 */
import type { FaqRow } from './faqs.repository';

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null } | null): MasterRef | null {
  if (!m) return null;
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface FaqSummaryDto {
  id: string;
  slug: string;
  question_en: string;
  question_hi: string | null;
  faq_category: MasterRef | null;
  publication_state: string;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: string | null;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toFaqSummaryDto(f: FaqRow): FaqSummaryDto {
  return {
    id: f.id,
    slug: f.slug,
    question_en: f.questionEn,
    question_hi: f.questionHi,
    faq_category: masterRef(f.faqCategory),
    publication_state: f.publicationState,
    public_visibility: f.publicVisibility,
    show_on_homepage: f.showOnHomepage,
    highlight_type: f.highlightType,
    display_order: f.displayOrder,
    published_at: iso(f.publishedAt),
    archived_at: iso(f.archivedAt),
    created_at: f.createdAt.toISOString(),
    updated_at: f.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface FaqDetailDto extends FaqSummaryDto {
  answer_en: string;
  answer_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export function toFaqDetailDto(f: FaqRow): FaqDetailDto {
  return {
    ...toFaqSummaryDto(f),
    answer_en: f.answerEn,
    answer_hi: f.answerHi,
    publish_start_at: iso(f.publishStartAt),
    highlight_start_at: iso(f.highlightStartAt),
    highlight_end_at: iso(f.highlightEndAt),
    created_by: f.createdById,
    updated_by: f.updatedById,
  };
}

// ── Public summary/detail (list + single carry the same Q&A shape) ─────────────
export interface PublicFaqDto {
  id: string;
  slug: string;
  question_en: string;
  question_hi: string | null;
  answer_en: string;
  answer_hi: string | null;
  faq_category: MasterRef | null;
  highlight_type: string | null;
}

export function toPublicFaqDto(f: FaqRow): PublicFaqDto {
  return {
    id: f.id,
    slug: f.slug,
    question_en: f.questionEn,
    question_hi: f.questionHi,
    answer_en: f.answerEn,
    answer_hi: f.answerHi,
    faq_category: masterRef(f.faqCategory),
    highlight_type: f.highlightType,
  };
}
