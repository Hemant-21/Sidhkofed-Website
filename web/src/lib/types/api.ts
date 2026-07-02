/**
 * Shared API envelope + compact reference types (API spec §1.4). Every backend
 * response uses exactly one envelope. The public site only ever reads these.
 */

export interface ResponseMeta {
  request_id: string;
  message?: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
  meta: ResponseMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
  meta: ResponseMeta;
}

/** A normalized list result used across the UI (data + pagination). */
export interface ListResult<T> {
  items: T[];
  pagination: Pagination;
}

// ── Compact references (API spec §1.4) ───────────────────────────────────────

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

export interface MediaRef {
  id: string;
  url: string;
  file_name: string;
  mime_type: string;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
}

export interface DocumentLinkRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: string;
  file_url: string;
  language: string;
  publication_date?: string | null;
}

export interface PageRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
}

export interface ProgrammeLinkRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
}

export interface InstitutionLinkRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

export interface GalleryLinkRef {
  id: string;
  slug: string;
  title_en: string;
  cover_media: MediaRef | null;
  image_count: number;
}
