/**
 * Gallery DTO + mapper.
 */
import type { GalleryRow, GallerySummaryRow } from './gallery.repository';
import { toMediaDto } from '@/modules/media/media.dto';

export interface GalleryImageDto {
  id: string;
  media: ReturnType<typeof toMediaDto>;
  display_order: number;
  caption_en: string | null;
  caption_hi: string | null;
}

export interface GalleryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  cover_media: ReturnType<typeof toMediaDto> | null;
  publication_state: string;
  public_visibility: boolean;
  show_on_homepage: boolean;
  display_order: number | null;
  image_count: number;
  images: GalleryImageDto[];
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lightweight LIST item (Issue 11): cover + image_count, NO `images` array. Detail responses
 * use the full `GalleryDto`.
 */
export interface GalleryListItemDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  cover_media: ReturnType<typeof toMediaDto> | null;
  publication_state: string;
  public_visibility: boolean;
  show_on_homepage: boolean;
  display_order: number | null;
  image_count: number;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toGalleryListItemDto(g: GallerySummaryRow): GalleryListItemDto {
  return {
    id: g.id,
    slug: g.slug,
    title_en: g.titleEn,
    title_hi: g.titleHi,
    description_en: g.descriptionEn,
    description_hi: g.descriptionHi,
    cover_media: g.coverMedia ? toMediaDto(g.coverMedia) : null,
    publication_state: g.publicationState,
    public_visibility: g.publicVisibility,
    show_on_homepage: g.showOnHomepage,
    display_order: g.displayOrder,
    image_count: g._count.images,
    published_at: g.publishedAt ? g.publishedAt.toISOString() : null,
    archived_at: g.archivedAt ? g.archivedAt.toISOString() : null,
    created_at: g.createdAt.toISOString(),
    updated_at: g.updatedAt.toISOString(),
  };
}

export function toGalleryDto(g: GalleryRow): GalleryDto {
  return {
    id: g.id,
    slug: g.slug,
    title_en: g.titleEn,
    title_hi: g.titleHi,
    description_en: g.descriptionEn,
    description_hi: g.descriptionHi,
    cover_media: g.coverMedia ? toMediaDto(g.coverMedia) : null,
    publication_state: g.publicationState,
    public_visibility: g.publicVisibility,
    show_on_homepage: g.showOnHomepage,
    display_order: g.displayOrder,
    image_count: g.images.length,
    images: g.images.map((img) => ({
      id: img.id,
      media: toMediaDto(img.media),
      display_order: img.displayOrder,
      caption_en: img.captionEn,
      caption_hi: img.captionHi,
    })),
    published_at: g.publishedAt ? g.publishedAt.toISOString() : null,
    archived_at: g.archivedAt ? g.archivedAt.toISOString() : null,
    created_at: g.createdAt.toISOString(),
    updated_at: g.updatedAt.toISOString(),
  };
}
