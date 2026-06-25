/**
 * Tender DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary, public detail. `gem_url` is an
 * external link the client opens in a new tab. `publish_date` is a calendar date; `submission_deadline`
 * and `opening_date` are timestamps. Public responses never expose `created_by`/`updated_by`.
 */
import type { TenderRow } from './tenders.repository';

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

const publicUrl = (slug: string): string => `/tenders/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnly = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface TenderSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  tender_type: MasterRef;
  tender_number: string | null;
  publish_date: string | null;
  submission_deadline: string | null;
  opening_date: string | null;
  tender_status: string | null;
  gem_url: string | null;
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

export function toTenderSummaryDto(t: TenderRow): TenderSummaryDto {
  return {
    id: t.id,
    slug: t.slug,
    title_en: t.titleEn,
    title_hi: t.titleHi,
    summary_en: t.summaryEn,
    tender_type: masterRef(t.tenderType),
    tender_number: t.tenderNumber,
    publish_date: dateOnly(t.publishDate),
    submission_deadline: iso(t.submissionDeadline),
    opening_date: iso(t.openingDate),
    tender_status: t.tenderStatus,
    gem_url: t.gemUrl,
    publication_state: t.publicationState,
    public_visibility: t.publicVisibility,
    show_on_homepage: t.showOnHomepage,
    highlight_type: t.highlightType,
    display_order: t.displayOrder,
    published_at: iso(t.publishedAt),
    archived_at: iso(t.archivedAt),
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface TenderDetailDto extends TenderSummaryDto {
  summary_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toTenderDetailDto(t: TenderRow): TenderDetailDto {
  return {
    ...toTenderSummaryDto(t),
    summary_hi: t.summaryHi,
    publish_start_at: iso(t.publishStartAt),
    highlight_start_at: iso(t.highlightStartAt),
    highlight_end_at: iso(t.highlightEndAt),
    created_by: t.createdById,
    updated_by: t.updatedById,
    public_url: publicUrl(t.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicTenderSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  tender_type: MasterRef;
  tender_number: string | null;
  publish_date: string | null;
  submission_deadline: string | null;
  opening_date: string | null;
  tender_status: string | null;
  gem_url: string | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicTenderSummaryDto(t: TenderRow): PublicTenderSummaryDto {
  return {
    id: t.id,
    slug: t.slug,
    title_en: t.titleEn,
    title_hi: t.titleHi,
    summary_en: t.summaryEn,
    summary_hi: t.summaryHi,
    tender_type: masterRef(t.tenderType),
    tender_number: t.tenderNumber,
    publish_date: dateOnly(t.publishDate),
    submission_deadline: iso(t.submissionDeadline),
    opening_date: iso(t.openingDate),
    tender_status: t.tenderStatus,
    gem_url: t.gemUrl,
    highlight_type: t.highlightType,
    public_url: publicUrl(t.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
// Tenders carry no extra detail-only body beyond the summary; the public detail is the same shape.
export type PublicTenderDetailDto = PublicTenderSummaryDto;

export function toPublicTenderDetailDto(t: TenderRow): PublicTenderDetailDto {
  return toPublicTenderSummaryDto(t);
}
