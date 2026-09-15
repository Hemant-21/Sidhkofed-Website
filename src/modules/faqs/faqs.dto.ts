/**
 * FAQ DTOs + mappers. Shapes: admin summary (list), admin detail (single), public summary/detail.
 * FAQs carry a full answer in every shape (they are short Q&A records), so the public list returns
 * answers too. Public responses never expose `created_by`/`updated_by`, or page assignments (those
 * are an admin-management concern; public consumers ask for a specific `page_key` instead).
 */
import type { FaqRow } from './faqs.repository';

export interface FaqPageAssignmentDto {
  page_key: string;
  display_order: number;
}

function pageAssignments(f: FaqRow): FaqPageAssignmentDto[] {
  return f.pageAssignments.map((a) => ({ page_key: a.pageKey, display_order: a.displayOrder }));
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface FaqSummaryDto {
  id: string;
  slug: string;
  question_en: string;
  question_hi: string | null;
  page_assignments: FaqPageAssignmentDto[];
  publication_state: string;
  public_visibility: boolean;
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
    page_assignments: pageAssignments(f),
    publication_state: f.publicationState,
    public_visibility: f.publicVisibility,
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
    highlight_type: f.highlightType,
  };
}
