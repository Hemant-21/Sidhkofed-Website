/**
 * Procurement Update DTOs + mappers (API spec §5/§6 + §1.4 reference shapes).
 *
 * Shapes: admin summary (list), admin detail (single), public summary, public detail. Rate is
 * transported as a JSON number (DECIMAL(14,2) fits a double exactly). Linked masters use the compact
 * master ref; the programme uses a title-based content ref; the linked document uses the shared
 * `DocumentRef`. Informational only — no transactions/inventory/payment fields exist.
 */
import { toDocumentRef, toPublicDocumentRef, type DocumentRef } from '@/modules/documents/documents.dto';
import { isPubliclyVisible } from '@/shared/visibility';
import type { ProcurementUpdateRow } from './procurement-updates.repository';

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}
function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null } | null): MasterRef | null {
  return m ? { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi } : null;
}

/** Programme is a content record (title-based), exposed as a compact reference. */
export interface ProgrammeRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
}
function programmeRef(p: { id: string; slug: string; titleEn: string; titleHi: string | null } | null): ProgrammeRef | null {
  return p ? { id: p.id, slug: p.slug, title_en: p.titleEn, title_hi: p.titleHi } : null;
}

/** Public programme ref — emitted only when the linked programme is itself publicly visible. */
function publicProgrammeRef(p: ProcurementUpdateRow['programmeScheme']): ProgrammeRef | null {
  return p && isPubliclyVisible(p) ? programmeRef(p) : null;
}

const publicUrl = (slug: string): string => `/procurement-updates/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnly = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
const dec = (d: { toString(): string } | null): number | null => (d === null ? null : Number(d));

function documentRef(row: ProcurementUpdateRow): DocumentRef | null {
  return row.document ? toDocumentRef(row.document) : null;
}

/** Public document ref — gated by the linked document's own public visibility (see toPublicDocumentRef). */
function publicDocumentRef(row: ProcurementUpdateRow): DocumentRef | null {
  return row.document ? toPublicDocumentRef(row.document) : null;
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface ProcurementUpdateSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  procurement_update_type: MasterRef;
  commodity: MasterRef | null;
  rate: number | null;
  unit: string | null;
  quantity: number | null;
  display_quantity_as_mt: boolean;
  effective_date: string | null;
  period_start: string | null;
  period_end: string | null;
  district: MasterRef | null;
  block: MasterRef | null;
  location_text: string | null;
  status: string | null;
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

export function toProcurementUpdateSummaryDto(p: ProcurementUpdateRow): ProcurementUpdateSummaryDto {
  return {
    id: p.id,
    slug: p.slug,
    title_en: p.titleEn,
    title_hi: p.titleHi,
    summary_en: p.summaryEn,
    procurement_update_type: masterRef(p.procurementUpdateType) as MasterRef,
    commodity: masterRef(p.commodity),
    rate: dec(p.rate),
    unit: p.unit,
    quantity: dec(p.quantity),
    display_quantity_as_mt: p.displayQuantityAsMt,
    effective_date: dateOnly(p.effectiveDate),
    period_start: dateOnly(p.periodStart),
    period_end: dateOnly(p.periodEnd),
    district: masterRef(p.district),
    block: masterRef(p.block),
    location_text: p.locationText,
    status: p.status,
    publication_state: p.publicationState,
    public_visibility: p.publicVisibility,
    show_on_homepage: p.showOnHomepage,
    highlight_type: p.highlightType,
    display_order: p.displayOrder,
    published_at: iso(p.publishedAt),
    archived_at: iso(p.archivedAt),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface ProcurementUpdateDetailDto extends ProcurementUpdateSummaryDto {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  programme: ProgrammeRef | null;
  document: DocumentRef | null;
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toProcurementUpdateDetailDto(p: ProcurementUpdateRow): ProcurementUpdateDetailDto {
  return {
    ...toProcurementUpdateSummaryDto(p),
    summary_hi: p.summaryHi,
    description_en: p.descriptionEn,
    description_hi: p.descriptionHi,
    programme: programmeRef(p.programmeScheme),
    document: documentRef(p),
    publish_start_at: iso(p.publishStartAt),
    highlight_start_at: iso(p.highlightStartAt),
    highlight_end_at: iso(p.highlightEndAt),
    created_by: p.createdById,
    updated_by: p.updatedById,
    public_url: publicUrl(p.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicProcurementUpdateSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  procurement_update_type: MasterRef;
  commodity: MasterRef | null;
  rate: number | null;
  unit: string | null;
  quantity: number | null;
  display_quantity_as_mt: boolean;
  effective_date: string | null;
  period_start: string | null;
  period_end: string | null;
  district: MasterRef | null;
  block: MasterRef | null;
  location_text: string | null;
  status: string | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicProcurementUpdateSummaryDto(p: ProcurementUpdateRow): PublicProcurementUpdateSummaryDto {
  return {
    id: p.id,
    slug: p.slug,
    title_en: p.titleEn,
    title_hi: p.titleHi,
    summary_en: p.summaryEn,
    summary_hi: p.summaryHi,
    procurement_update_type: masterRef(p.procurementUpdateType) as MasterRef,
    commodity: masterRef(p.commodity),
    rate: dec(p.rate),
    unit: p.unit,
    quantity: dec(p.quantity),
    display_quantity_as_mt: p.displayQuantityAsMt,
    effective_date: dateOnly(p.effectiveDate),
    period_start: dateOnly(p.periodStart),
    period_end: dateOnly(p.periodEnd),
    district: masterRef(p.district),
    block: masterRef(p.block),
    location_text: p.locationText,
    status: p.status,
    highlight_type: p.highlightType,
    public_url: publicUrl(p.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
export interface PublicProcurementUpdateDetailDto extends PublicProcurementUpdateSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  programme: ProgrammeRef | null;
  document: DocumentRef | null;
}

export function toPublicProcurementUpdateDetailDto(p: ProcurementUpdateRow): PublicProcurementUpdateDetailDto {
  return {
    ...toPublicProcurementUpdateSummaryDto(p),
    description_en: p.descriptionEn,
    description_hi: p.descriptionHi,
    programme: publicProgrammeRef(p.programmeScheme),
    document: publicDocumentRef(p),
  };
}
