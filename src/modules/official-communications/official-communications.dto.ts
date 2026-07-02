/**
 * Official Communication DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary, public detail. The linked
 * document is exposed via the shared compact `DocumentRef` (reused from the documents module — upload
 * once, link by reference). Public responses never expose `created_by`/`updated_by` or storage keys.
 */
import { toDocumentRef, toPublicDocumentRef, type DocumentRef } from '@/modules/documents/documents.dto';
import type { OfficialCommunicationRow } from './official-communications.repository';

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

const publicUrl = (slug: string): string => `/official-communications/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnly = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

function documentRef(row: OfficialCommunicationRow): DocumentRef | null {
  return row.document ? toDocumentRef(row.document) : null;
}

/** Public document ref — gated by the linked document's own public visibility (see toPublicDocumentRef). */
function publicDocumentRef(row: OfficialCommunicationRow): DocumentRef | null {
  return row.document ? toPublicDocumentRef(row.document) : null;
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface OfficialCommunicationSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  communication_type: MasterRef;
  reference_number: string | null;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
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

export function toOfficialCommunicationSummaryDto(c: OfficialCommunicationRow): OfficialCommunicationSummaryDto {
  return {
    id: c.id,
    slug: c.slug,
    title_en: c.titleEn,
    title_hi: c.titleHi,
    summary_en: c.summaryEn,
    communication_type: masterRef(c.communicationType),
    reference_number: c.referenceNumber,
    issue_date: dateOnly(c.issueDate),
    effective_date: dateOnly(c.effectiveDate),
    expiry_date: dateOnly(c.expiryDate),
    issuing_authority: c.issuingAuthority,
    publication_state: c.publicationState,
    public_visibility: c.publicVisibility,
    show_on_homepage: c.showOnHomepage,
    highlight_type: c.highlightType,
    display_order: c.displayOrder,
    published_at: iso(c.publishedAt),
    archived_at: iso(c.archivedAt),
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface OfficialCommunicationDetailDto extends OfficialCommunicationSummaryDto {
  summary_hi: string | null;
  body_en: string | null;
  body_hi: string | null;
  document: DocumentRef | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toOfficialCommunicationDetailDto(c: OfficialCommunicationRow): OfficialCommunicationDetailDto {
  return {
    ...toOfficialCommunicationSummaryDto(c),
    summary_hi: c.summaryHi,
    body_en: c.bodyEn,
    body_hi: c.bodyHi,
    document: documentRef(c),
    publish_start_at: iso(c.publishStartAt),
    highlight_start_at: iso(c.highlightStartAt),
    highlight_end_at: iso(c.highlightEndAt),
    created_by: c.createdById,
    updated_by: c.updatedById,
    public_url: publicUrl(c.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicOfficialCommunicationSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  communication_type: MasterRef;
  reference_number: string | null;
  issue_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicOfficialCommunicationSummaryDto(
  c: OfficialCommunicationRow,
): PublicOfficialCommunicationSummaryDto {
  return {
    id: c.id,
    slug: c.slug,
    title_en: c.titleEn,
    title_hi: c.titleHi,
    summary_en: c.summaryEn,
    summary_hi: c.summaryHi,
    communication_type: masterRef(c.communicationType),
    reference_number: c.referenceNumber,
    issue_date: dateOnly(c.issueDate),
    effective_date: dateOnly(c.effectiveDate),
    expiry_date: dateOnly(c.expiryDate),
    issuing_authority: c.issuingAuthority,
    highlight_type: c.highlightType,
    public_url: publicUrl(c.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
export interface PublicOfficialCommunicationDetailDto extends PublicOfficialCommunicationSummaryDto {
  body_en: string | null;
  body_hi: string | null;
  document: DocumentRef | null;
}

export function toPublicOfficialCommunicationDetailDto(
  c: OfficialCommunicationRow,
): PublicOfficialCommunicationDetailDto {
  return {
    ...toPublicOfficialCommunicationSummaryDto(c),
    body_en: c.bodyEn,
    body_hi: c.bodyHi,
    document: publicDocumentRef(c),
  };
}
