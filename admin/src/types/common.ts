/**
 * Shared domain primitives consumed by every future module. These mirror the
 * compact reference shapes in the API spec §1.4 and build-context §10.2. They are
 * intentionally generic — no module-specific fields live here.
 */

export type Language = 'en' | 'hi';

/** Publication lifecycle states (codex §8 / schema). Stored lower-case. */
export type PublicationState = 'draft' | 'published' | 'unpublished' | 'archived';

/** Common highlight set (codex §9 / reconciliation C6). */
export type HighlightType = 'new' | 'latest' | 'important' | 'urgent' | 'featured';

/** Bilingual text pair: `*_en` required where the field is required, `*_hi` optional. */
export interface Bilingual {
  en: string;
  hi?: string | null;
}

/** Compact master reference (API spec §1.4). */
export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi?: string | null;
}

/** Compact media reference (API spec §1.4). */
export interface MediaRef {
  id: string;
  url: string;
  file_name?: string;
  mime_type?: string;
  title?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
}

/** Compact document reference (API spec §1.4). */
export interface DocumentRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi?: string | null;
  document_type: string;
  file_url: string;
  language: Language;
  publication_date?: string | null;
}

/**
 * The common publishable-entity shape (build-context §8.2). Every content module
 * returns at least these workflow fields; module DTOs extend this.
 */
export interface PublishableEntity {
  id: string;
  slug: string;
  title_en: string;
  title_hi?: string | null;
  publication_state: PublicationState;
  public_visibility: boolean;
  display_order?: number | null;
  highlight_type?: HighlightType | null;
  show_on_homepage?: boolean;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** A record that can be soft-archived/restored. */
export interface Archivable {
  archived_at?: string | null;
}
