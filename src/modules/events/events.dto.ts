/**
 * Event DTOs + mappers (API spec §5/§6, Appendix A.1/A.2). Shapes: admin summary/detail, public
 * summary/detail. List responses are lightweight (no dynamic_values / relationships); detail
 * returns all common fields, dynamic_values, completion fields, every linked master/relationship,
 * and the news link when published as news. `toEventRef` is the compact cross-module reference.
 */
import type { Event } from '@prisma/client';
import { mediaRef, type MediaRef, type MasterRef } from '@/modules/institutions/institutions.dto';
import type { EventRow, EventSummaryRow } from './events.repository';

function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

const publicUrl = (slug: string): string => `/events/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnly = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
const dynamic = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

// ── Compact references ─────────────────────────────────────────────────────────
export interface EventRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  event_status: string;
}
export function toEventRef(e: Event): EventRef {
  return { id: e.id, slug: e.slug, title_en: e.titleEn, title_hi: e.titleHi, event_status: e.eventStatus };
}

interface DocumentLinkRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: string;
  file_url: string;
  language: string;
}
interface GalleryLinkRef {
  id: string;
  slug: string;
  title_en: string;
  cover_media: MediaRef | null;
  image_count: number;
}
interface NewsLinkRef {
  id: string;
  slug: string;
  title_en: string;
  publication_state: string;
  news_published_at: string | null;
  public_url: string;
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface EventSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  event_type: MasterRef;
  event_status: string;
  date_mode: string;
  start_date: string;
  end_date: string | null;
  location_text: string | null;
  district: MasterRef | null;
  cover_media: MediaRef | null;
  highlight_type: string | null;
  display_order: number | null;
  show_on_homepage: boolean;
  publication_state: string;
  public_visibility: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toEventSummaryDto(e: EventSummaryRow): EventSummaryDto {
  return {
    id: e.id,
    slug: e.slug,
    title_en: e.titleEn,
    title_hi: e.titleHi,
    summary_en: e.summaryEn,
    event_type: masterRef(e.eventType),
    event_status: e.eventStatus,
    date_mode: e.dateMode,
    start_date: dateOnly(e.startDate) as string,
    end_date: dateOnly(e.endDate),
    location_text: e.locationText,
    district: e.district ? masterRef(e.district) : null,
    cover_media: mediaRef(e.coverMedia),
    highlight_type: e.highlightType,
    display_order: e.displayOrder,
    show_on_homepage: e.showOnHomepage,
    publication_state: e.publicationState,
    public_visibility: e.publicVisibility,
    published_at: iso(e.publishedAt),
    archived_at: iso(e.archivedAt),
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface EventDetailDto extends EventSummaryDto {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  training_type: MasterRef | null;
  block: MasterRef | null;
  status_override: boolean;
  cancellation_reason: string | null;
  revised_start_date: string | null;
  dynamic_values: Record<string, unknown>;
  // completion
  outcome_summary_en: string | null;
  outcome_summary_hi: string | null;
  key_highlights: string | null;
  final_participant_count: number | null;
  participant_male_count: number | null;
  participant_female_count: number | null;
  participant_other_count: number | null;
  completion_remarks_en: string | null;
  completion_remarks_hi: string | null;
  completed_date: string | null;
  translation_source: string;
  // relationships
  commodities: MasterRef[];
  programmes: Array<{ id: string; slug: string; title_en: string; title_hi: string | null; short_code: string | null }>;
  institutions: Array<{ id: string; slug: string; name_en: string; name_hi: string | null }>;
  documents: DocumentLinkRef[];
  galleries: GalleryLinkRef[];
  news: NewsLinkRef[];
  // workflow
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

function documentLinks(e: EventRow): DocumentLinkRef[] {
  return e.documents.map((d) => ({
    id: d.document.id,
    slug: d.document.slug,
    title_en: d.document.titleEn,
    title_hi: d.document.titleHi,
    document_type: d.document.documentType.slug,
    file_url: d.document.fileAsset.url,
    language: d.document.language,
  }));
}
function galleryLinks(e: EventRow): GalleryLinkRef[] {
  return e.galleries.map((g) => ({
    id: g.gallery.id,
    slug: g.gallery.slug,
    title_en: g.gallery.titleEn,
    cover_media: mediaRef(g.gallery.coverMedia),
    image_count: g.gallery._count.images,
  }));
}
function newsLinks(e: EventRow): NewsLinkRef[] {
  return e.news.map((n) => ({
    id: n.id,
    slug: n.slug,
    title_en: n.titleEn,
    publication_state: n.publicationState,
    news_published_at: iso(n.newsPublishedAt),
    public_url: `/news/${n.slug}`,
  }));
}

export function toEventDetailDto(e: EventRow): EventDetailDto {
  return {
    ...toEventSummaryDto(e),
    summary_hi: e.summaryHi,
    description_en: e.descriptionEn,
    description_hi: e.descriptionHi,
    training_type: e.trainingType ? masterRef(e.trainingType) : null,
    block: e.block ? masterRef(e.block) : null,
    status_override: e.statusOverride,
    cancellation_reason: e.cancellationReason,
    revised_start_date: dateOnly(e.revisedStartDate),
    dynamic_values: dynamic(e.dynamicValues),
    outcome_summary_en: e.outcomeSummaryEn,
    outcome_summary_hi: e.outcomeSummaryHi,
    key_highlights: e.keyHighlights,
    final_participant_count: e.finalParticipantCount,
    participant_male_count: e.participantMaleCount,
    participant_female_count: e.participantFemaleCount,
    participant_other_count: e.participantOtherCount,
    completion_remarks_en: e.completionRemarksEn,
    completion_remarks_hi: e.completionRemarksHi,
    completed_date: dateOnly(e.completedDate),
    translation_source: e.translationSource,
    commodities: e.commodities.map((c) => masterRef(c.commodity)),
    programmes: e.programmes.map((p) => ({
      id: p.programmeScheme.id,
      slug: p.programmeScheme.slug,
      title_en: p.programmeScheme.titleEn,
      title_hi: p.programmeScheme.titleHi,
      short_code: p.programmeScheme.shortCode,
    })),
    institutions: e.institutions.map((i) => ({
      id: i.institution.id,
      slug: i.institution.slug,
      name_en: i.institution.nameEn,
      name_hi: i.institution.nameHi,
    })),
    documents: documentLinks(e),
    galleries: galleryLinks(e),
    news: newsLinks(e),
    publish_start_at: iso(e.publishStartAt),
    highlight_start_at: iso(e.highlightStartAt),
    highlight_end_at: iso(e.highlightEndAt),
    created_by: e.createdById,
    updated_by: e.updatedById,
    public_url: publicUrl(e.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicEventSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  event_type: MasterRef;
  event_status: string;
  date_mode: string;
  start_date: string;
  end_date: string | null;
  location_text: string | null;
  district: MasterRef | null;
  cover_media: MediaRef | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicEventSummaryDto(e: EventSummaryRow): PublicEventSummaryDto {
  return {
    id: e.id,
    slug: e.slug,
    title_en: e.titleEn,
    title_hi: e.titleHi,
    summary_en: e.summaryEn,
    event_type: masterRef(e.eventType),
    event_status: e.eventStatus,
    date_mode: e.dateMode,
    start_date: dateOnly(e.startDate) as string,
    end_date: dateOnly(e.endDate),
    location_text: e.locationText,
    district: e.district ? masterRef(e.district) : null,
    cover_media: mediaRef(e.coverMedia),
    highlight_type: e.highlightType,
    public_url: publicUrl(e.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
export interface PublicEventDetailDto extends PublicEventSummaryDto {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  training_type: MasterRef | null;
  block: MasterRef | null;
  dynamic_values: Record<string, unknown>;
  outcome_summary_en: string | null;
  outcome_summary_hi: string | null;
  key_highlights: string | null;
  final_participant_count: number | null;
  completed_date: string | null;
  translation_source: string;
  commodities: MasterRef[];
  programmes: Array<{ id: string; slug: string; title_en: string; title_hi: string | null; short_code: string | null }>;
  institutions: Array<{ id: string; slug: string; name_en: string; name_hi: string | null }>;
  documents: DocumentLinkRef[];
  galleries: GalleryLinkRef[];
  news: NewsLinkRef[];
  published_at: string | null;
}

export function toPublicEventDetailDto(e: EventRow): PublicEventDetailDto {
  return {
    ...toPublicEventSummaryDto(e),
    summary_hi: e.summaryHi,
    description_en: e.descriptionEn,
    description_hi: e.descriptionHi,
    training_type: e.trainingType ? masterRef(e.trainingType) : null,
    block: e.block ? masterRef(e.block) : null,
    dynamic_values: dynamic(e.dynamicValues),
    outcome_summary_en: e.outcomeSummaryEn,
    outcome_summary_hi: e.outcomeSummaryHi,
    key_highlights: e.keyHighlights,
    final_participant_count: e.finalParticipantCount,
    completed_date: dateOnly(e.completedDate),
    translation_source: e.translationSource,
    commodities: e.commodities.map((c) => masterRef(c.commodity)),
    programmes: e.programmes.map((p) => ({
      id: p.programmeScheme.id,
      slug: p.programmeScheme.slug,
      title_en: p.programmeScheme.titleEn,
      title_hi: p.programmeScheme.titleHi,
      short_code: p.programmeScheme.shortCode,
    })),
    institutions: e.institutions.map((i) => ({
      id: i.institution.id,
      slug: i.institution.slug,
      name_en: i.institution.nameEn,
      name_hi: i.institution.nameHi,
    })),
    // documents / galleries / news are pre-filtered to public-visible rows by the repository's
    // publicEventInclude (single shared predicate incl. the publish_start_at gate — Issue 1).
    documents: documentLinks(e),
    galleries: galleryLinks(e),
    news: newsLinks(e),
    published_at: iso(e.publishedAt),
  };
}
