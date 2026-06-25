/**
 * Programme DTOs + mappers (API spec §5/§6). Shapes: admin summary/detail, public summary/detail.
 * `toProgrammeRef` is the compact cross-module reference reused by the Events module.
 */
import type { ProgrammeScheme } from '@prisma/client';
import { mediaRef, type MediaRef, type MasterRef } from '@/modules/institutions/institutions.dto';
import type { ProgrammeRow, ProgrammeSummaryRow } from './programmes.repository';

function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

const publicUrl = (slug: string): string => `/programmes/${slug}`;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnly = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

// ── Compact cross-module reference ─────────────────────────────────────────────
export interface ProgrammeRef {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
}
export function toProgrammeRef(p: ProgrammeScheme): ProgrammeRef {
  return { id: p.id, slug: p.slug, title_en: p.titleEn, title_hi: p.titleHi, short_code: p.shortCode };
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface ProgrammeSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
  summary_en: string | null;
  funding_source: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_media: MediaRef | null;
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

export function toProgrammeSummaryDto(p: ProgrammeSummaryRow): ProgrammeSummaryDto {
  return {
    id: p.id,
    slug: p.slug,
    title_en: p.titleEn,
    title_hi: p.titleHi,
    short_code: p.shortCode,
    summary_en: p.summaryEn,
    funding_source: p.fundingSource,
    start_date: dateOnly(p.startDate),
    end_date: dateOnly(p.endDate),
    cover_media: mediaRef(p.coverMedia),
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
export interface ProgrammeDetailDto extends ProgrammeSummaryDto {
  summary_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  objectives_en: string | null;
  objectives_hi: string | null;
  eligibility_en: string | null;
  eligibility_hi: string | null;
  benefits_en: string | null;
  benefits_hi: string | null;
  application_process_en: string | null;
  application_process_hi: string | null;
  commodities: MasterRef[];
  permitted_training_types: MasterRef[];
  publish_start_at: string | null;
  highlight_start_at: string | null;
  highlight_end_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  public_url: string;
}

export function toProgrammeDetailDto(p: ProgrammeRow): ProgrammeDetailDto {
  return {
    ...toProgrammeSummaryDto(p),
    summary_hi: p.summaryHi,
    description_en: p.descriptionEn,
    description_hi: p.descriptionHi,
    objectives_en: p.objectivesEn,
    objectives_hi: p.objectivesHi,
    eligibility_en: p.eligibilityEn,
    eligibility_hi: p.eligibilityHi,
    benefits_en: p.benefitsEn,
    benefits_hi: p.benefitsHi,
    application_process_en: p.applicationProcessEn,
    application_process_hi: p.applicationProcessHi,
    commodities: p.commodities.map((c) => masterRef(c.commodity)),
    permitted_training_types: p.permittedTrainingTypes.map((t) => masterRef(t.trainingType)),
    publish_start_at: iso(p.publishStartAt),
    highlight_start_at: iso(p.highlightStartAt),
    highlight_end_at: iso(p.highlightEndAt),
    created_by: p.createdById,
    updated_by: p.updatedById,
    public_url: publicUrl(p.slug),
  };
}

// ── Public summary (list) ─────────────────────────────────────────────────────
export interface PublicProgrammeSummaryDto {
  id: string;
  slug: string;
  title_en: string;
  title_hi: string | null;
  short_code: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_media: MediaRef | null;
  highlight_type: string | null;
  public_url: string;
}

export function toPublicProgrammeSummaryDto(p: ProgrammeSummaryRow): PublicProgrammeSummaryDto {
  return {
    id: p.id,
    slug: p.slug,
    title_en: p.titleEn,
    title_hi: p.titleHi,
    short_code: p.shortCode,
    summary_en: p.summaryEn,
    summary_hi: p.summaryHi,
    start_date: dateOnly(p.startDate),
    end_date: dateOnly(p.endDate),
    cover_media: mediaRef(p.coverMedia),
    highlight_type: p.highlightType,
    public_url: publicUrl(p.slug),
  };
}

// ── Public detail (single) ────────────────────────────────────────────────────
export interface PublicProgrammeDetailDto extends PublicProgrammeSummaryDto {
  description_en: string | null;
  description_hi: string | null;
  objectives_en: string | null;
  objectives_hi: string | null;
  eligibility_en: string | null;
  eligibility_hi: string | null;
  benefits_en: string | null;
  benefits_hi: string | null;
  application_process_en: string | null;
  application_process_hi: string | null;
  funding_source: string | null;
  commodities: MasterRef[];
  permitted_training_types: MasterRef[];
}

export function toPublicProgrammeDetailDto(p: ProgrammeRow): PublicProgrammeDetailDto {
  return {
    ...toPublicProgrammeSummaryDto(p),
    description_en: p.descriptionEn,
    description_hi: p.descriptionHi,
    objectives_en: p.objectivesEn,
    objectives_hi: p.objectivesHi,
    eligibility_en: p.eligibilityEn,
    eligibility_hi: p.eligibilityHi,
    benefits_en: p.benefitsEn,
    benefits_hi: p.benefitsHi,
    application_process_en: p.applicationProcessEn,
    application_process_hi: p.applicationProcessHi,
    funding_source: p.fundingSource,
    commodities: p.commodities.map((c) => masterRef(c.commodity)),
    permitted_training_types: p.permittedTrainingTypes.map((t) => masterRef(t.trainingType)),
  };
}
