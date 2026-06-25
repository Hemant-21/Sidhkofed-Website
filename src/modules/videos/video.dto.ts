/**
 * Video DTO + mapper.
 */
import type { Video } from '@prisma/client';

export interface VideoDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  youtube_id: string;
  youtube_url: string;
  thumbnail_url: string;
  thumbnail_media_id: string | null;
  publication_state: string;
  public_visibility: boolean;
  show_on_homepage: boolean;
  display_order: number | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toVideoDto(v: Video): VideoDto {
  return {
    id: v.id,
    slug: v.slug,
    title_en: v.titleEn,
    title_hi: v.titleHi,
    description_en: v.descriptionEn,
    description_hi: v.descriptionHi,
    youtube_id: v.youtubeId,
    youtube_url: v.youtubeUrl,
    thumbnail_url: `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
    thumbnail_media_id: v.thumbnailMediaId,
    publication_state: v.publicationState,
    public_visibility: v.publicVisibility,
    show_on_homepage: v.showOnHomepage,
    display_order: v.displayOrder,
    published_at: v.publishedAt ? v.publishedAt.toISOString() : null,
    archived_at: v.archivedAt ? v.archivedAt.toISOString() : null,
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
  };
}
