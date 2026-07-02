/**
 * Document DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Four response shapes:
 *   - admin summary  (list)   — lightweight: masters + file ref, no relation collections.
 *   - admin detail   (single) — full bilingual content + all junction references + workflow.
 *   - public summary (list)   — public-safe subset (no internal/workflow/audit fields).
 *   - public detail  (single) — public-safe + junction references + file_url.
 *
 * `toDocumentRef` is the compact cross-module reference (id, slug, bilingual title, document
 * type, file_url, language, publication_date) future modules (events/communications/…) reuse.
 * Public responses NEVER expose `created_by`/`updated_by`, internal flags, or storage keys.
 */
import type { Document, DocumentType, FinancialYear, MediaAsset } from '@prisma/client';
import { isPubliclyVisible } from '@/shared/visibility';
import type { DocumentRow, DocumentSummaryRow } from './documents.repository';

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

export interface FinancialYearRef {
  id: string;
  label: string;
}
function fyRef(fy: FinancialYear | null): FinancialYearRef | null {
  return fy ? { id: fy.id, label: fy.label } : null;
}

/** Public-safe view of the linked file asset — file_url is the stable delivery endpoint. */
export interface DocumentFileRef {
  id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  title: string | null;
}
function fileRef(a: MediaAsset): DocumentFileRef {
  return {
    id: a.id,
    file_url: a.url,
    file_name: a.fileName,
    mime_type: a.mimeType,
    file_size: Number(a.fileSizeBytes),
    title: a.title,
  };
}

const publicUrl = (slug: string): string => `/documents/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnly = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

// ── Compact cross-module reference (§1.4) ─────────────────────────────────────
export interface DocumentRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: string; // slug
  file_url: string;
  language: string;
  publication_date: string | null;
}
export type DocumentRefRow = Document & { documentType: DocumentType; fileAsset: MediaAsset };

export function toDocumentRef(d: DocumentRefRow): DocumentRef {
  return {
    id: d.id,
    slug: d.slug,
    title_en: d.titleEn,
    title_hi: d.titleHi,
    document_type: d.documentType.slug,
    file_url: d.fileAsset.url,
    language: d.language,
    publication_date: dateOnly(d.publicationDate),
  };
}

/**
 * Public-safe compact reference: emits the document ref ONLY when the linked document itself
 * satisfies the public-visibility predicate (published, public, is_public, not archived, publish
 * window open). Returns null otherwise, so a public parent never leaks a hidden document's metadata
 * or its `file_url` (which the public media endpoint would later 403). Reuses the shared predicate
 * (the single source of truth) with the Documents-only `is_public` requirement.
 */
export function toPublicDocumentRef(d: DocumentRefRow, now: Date = new Date()): DocumentRef | null {
  return isPubliclyVisible(d, { now, requireIsPublic: true }) ? toDocumentRef(d) : null;
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface DocumentSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: MasterRef;
  knowledge_category: MasterRef | null;
  financial_year: FinancialYearRef | null;
  language: string;
  publication_date: string | null;
  is_public: boolean;
  show_in_knowledge_centre: boolean;
  file: DocumentFileRef;
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

export function toDocumentSummaryDto(d: DocumentSummaryRow): DocumentSummaryDto {
  return {
    id: d.id,
    slug: d.slug,
    title_en: d.titleEn,
    title_hi: d.titleHi,
    document_type: masterRef(d.documentType),
    knowledge_category: d.knowledgeCategory ? masterRef(d.knowledgeCategory) : null,
    financial_year: fyRef(d.financialYear),
    language: d.language,
    publication_date: dateOnly(d.publicationDate),
    is_public: d.isPublic,
    show_in_knowledge_centre: d.showInKnowledgeCentre,
    file: fileRef(d.fileAsset),
    publication_state: d.publicationState,
    public_visibility: d.publicVisibility,
    show_on_homepage: d.showOnHomepage,
    highlight_type: d.highlightType,
    display_order: d.displayOrder,
    published_at: iso(d.publishedAt),
    archived_at: iso(d.archivedAt),
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface DocumentDetailDto extends DocumentSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  commodities: MasterRef[];
  districts: MasterRef[];
  tags: MasterRef[];
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toDocumentDetailDto(d: DocumentRow): DocumentDetailDto {
  return {
    ...toDocumentSummaryDto(d),
    description_en: d.descriptionEn,
    description_hi: d.descriptionHi,
    commodities: d.commodities.map((c) => masterRef(c.commodity)),
    districts: d.districts.map((x) => masterRef(x.district)),
    tags: d.tags.map((t) => masterRef(t.tag)),
    publish_start_at: iso(d.publishStartAt),
    highlight_start_at: iso(d.highlightStartAt),
    highlight_end_at: iso(d.highlightEndAt),
    created_by: d.createdById,
    updated_by: d.updatedById,
    public_url: publicUrl(d.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicDocumentSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  document_type: MasterRef;
  knowledge_category: MasterRef | null;
  financial_year: FinancialYearRef | null;
  language: string;
  publication_date: string | null;
  show_in_knowledge_centre: boolean;
  file: DocumentFileRef;
  highlight_type: string | null;
  published_at: string | null;
  public_url: string;
}

export function toPublicDocumentSummaryDto(d: DocumentSummaryRow): PublicDocumentSummaryDto {
  return {
    id: d.id,
    slug: d.slug,
    title_en: d.titleEn,
    title_hi: d.titleHi,
    document_type: masterRef(d.documentType),
    knowledge_category: d.knowledgeCategory ? masterRef(d.knowledgeCategory) : null,
    financial_year: fyRef(d.financialYear),
    language: d.language,
    publication_date: dateOnly(d.publicationDate),
    show_in_knowledge_centre: d.showInKnowledgeCentre,
    file: fileRef(d.fileAsset),
    highlight_type: d.highlightType,
    published_at: iso(d.publishedAt),
    public_url: publicUrl(d.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
// Tags are intentionally omitted: they are internal CMS classification (isPublic: false in the
// masters registry) and must not appear in any public-facing response.
export interface PublicDocumentDetailDto extends PublicDocumentSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  commodities: MasterRef[];
  districts: MasterRef[];
}

export function toPublicDocumentDetailDto(d: DocumentRow): PublicDocumentDetailDto {
  return {
    ...toPublicDocumentSummaryDto(d),
    description_en: d.descriptionEn,
    description_hi: d.descriptionHi,
    commodities: d.commodities.map((c) => masterRef(c.commodity)),
    districts: d.districts.map((x) => masterRef(x.district)),
  };
}
