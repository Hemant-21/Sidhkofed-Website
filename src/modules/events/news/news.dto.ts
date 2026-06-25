/**
 * Event News DTOs + mappers (API spec §5/§6). News carries its own editorial fields and a compact
 * source-event reference (CMS requirements §4.1: "News remains linked to the original event").
 */
import { mediaRef, type MediaRef } from '@/modules/institutions/institutions.dto';
import type { NewsRow } from './news.repository';

const publicUrl = (slug: string): string => `/news/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

interface SourceEventRef {
  id: string;
  slug: string;
  title_en: string;
  event_type: string;
  public_url: string;
}
function sourceEvent(n: NewsRow): SourceEventRef {
  return {
    id: n.event.id,
    slug: n.event.slug,
    title_en: n.event.titleEn,
    event_type: n.event.eventType.slug,
    public_url: `/events/${n.event.slug}`,
  };
}

// ── Admin summary ─────────────────────────────────────────────────────────────
export interface NewsSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  cover_media: MediaRef | null;
  news_published_at: string | null;
  source_event: SourceEventRef;
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

export function toNewsSummaryDto(n: NewsRow): NewsSummaryDto {
  return {
    id: n.id,
    slug: n.slug,
    title_en: n.titleEn,
    title_hi: n.titleHi,
    summary_en: n.summaryEn,
    cover_media: mediaRef(n.coverMedia),
    news_published_at: iso(n.newsPublishedAt),
    source_event: sourceEvent(n),
    publication_state: n.publicationState,
    public_visibility: n.publicVisibility,
    show_on_homepage: n.showOnHomepage,
    highlight_type: n.highlightType,
    display_order: n.displayOrder,
    published_at: iso(n.publishedAt),
    archived_at: iso(n.archivedAt),
    created_at: n.createdAt.toISOString(),
    updated_at: n.updatedAt.toISOString(),
  };
}

// ── Admin detail ──────────────────────────────────────────────────────────────
export interface NewsDetailDto extends NewsSummaryDto {
  summary_hi: string | null;
  body_en: string | null;
  body_hi: string | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toNewsDetailDto(n: NewsRow): NewsDetailDto {
  return {
    ...toNewsSummaryDto(n),
    summary_hi: n.summaryHi,
    body_en: n.bodyEn,
    body_hi: n.bodyHi,
    publish_start_at: iso(n.publishStartAt),
    highlight_start_at: iso(n.highlightStartAt),
    highlight_end_at: iso(n.highlightEndAt),
    created_by: n.createdById,
    updated_by: n.updatedById,
    public_url: publicUrl(n.slug),
  };
}

// ── Public summary/detail ──────────────────────────────────────────────────────
export interface PublicNewsSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  cover_media: MediaRef | null;
  news_published_at: string | null;
  source_event: SourceEventRef;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicNewsSummaryDto(n: NewsRow): PublicNewsSummaryDto {
  return {
    id: n.id,
    slug: n.slug,
    title_en: n.titleEn,
    title_hi: n.titleHi,
    summary_en: n.summaryEn,
    summary_hi: n.summaryHi,
    cover_media: mediaRef(n.coverMedia),
    news_published_at: iso(n.newsPublishedAt),
    source_event: sourceEvent(n),
    highlight_type: n.highlightType,
    public_url: publicUrl(n.slug),
  };
}

export interface PublicNewsDetailDto extends PublicNewsSummaryDto {
  body_en: string | null;
  body_hi: string | null;
}

export function toPublicNewsDetailDto(n: NewsRow): PublicNewsDetailDto {
  return { ...toPublicNewsSummaryDto(n), body_en: n.bodyEn, body_hi: n.bodyHi };
}
