/**
 * Pure form ↔ API mapping for the programme form (unit-testable; no React). Converts the flat,
 * string-friendly form state into the typed `ProgrammeWriteInput` the backend accepts: empties
 * become null, the highlight window is only sent with a highlight, dates widen to the transport
 * shapes (start/end are calendar dates; publish/highlight windows are ISO timestamps). Server-
 * managed fields (slug, state, *_by) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { ProgrammeDetail, ProgrammeWriteInput } from './types';

export interface ProgrammeFormValues {
  title_en: string;
  title_hi: string;
  short_code: string;
  summary_en: string;
  summary_hi: string;
  description_en: string;
  description_hi: string;
  objectives_en: string;
  objectives_hi: string;
  eligibility_en: string;
  eligibility_hi: string;
  benefits_en: string;
  benefits_hi: string;
  application_process_en: string;
  application_process_hi: string;
  funding_source: string;
  start_date: string;
  end_date: string;
  cover_media_id: string | null;
  commodity_ids: string[];
  permitted_training_type_ids: string[];
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: string;
  highlight_start_at: string;
  highlight_end_at: string;
  display_order: string;
  publish_start_at: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const dateOnly = (v: string): string | null => (v ? v : null);
const dateToIso = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

/** Default (empty) form values for the create route. */
export function emptyProgrammeForm(): ProgrammeFormValues {
  return {
    title_en: '',
    title_hi: '',
    short_code: '',
    summary_en: '',
    summary_hi: '',
    description_en: '',
    description_hi: '',
    objectives_en: '',
    objectives_hi: '',
    eligibility_en: '',
    eligibility_hi: '',
    benefits_en: '',
    benefits_hi: '',
    application_process_en: '',
    application_process_hi: '',
    funding_source: '',
    start_date: '',
    end_date: '',
    cover_media_id: null,
    commodity_ids: [],
    permitted_training_type_ids: [],
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

/** Hydrate the form from an existing programme (edit route). */
export function programmeToForm(p: ProgrammeDetail): ProgrammeFormValues {
  return {
    title_en: p.title_en,
    title_hi: p.title_hi ?? '',
    short_code: p.short_code ?? '',
    summary_en: p.summary_en ?? '',
    summary_hi: p.summary_hi ?? '',
    description_en: p.description_en ?? '',
    description_hi: p.description_hi ?? '',
    objectives_en: p.objectives_en ?? '',
    objectives_hi: p.objectives_hi ?? '',
    eligibility_en: p.eligibility_en ?? '',
    eligibility_hi: p.eligibility_hi ?? '',
    benefits_en: p.benefits_en ?? '',
    benefits_hi: p.benefits_hi ?? '',
    application_process_en: p.application_process_en ?? '',
    application_process_hi: p.application_process_hi ?? '',
    funding_source: p.funding_source ?? '',
    start_date: p.start_date ? p.start_date.slice(0, 10) : '',
    end_date: p.end_date ? p.end_date.slice(0, 10) : '',
    cover_media_id: p.cover_media?.id ?? null,
    commodity_ids: p.commodities.map((c) => c.id),
    permitted_training_type_ids: p.permitted_training_types.map((t) => t.id),
    public_visibility: p.public_visibility,
    show_on_homepage: p.show_on_homepage,
    highlight_type: p.highlight_type ?? '',
    highlight_start_at: p.highlight_start_at ? p.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: p.highlight_end_at ? p.highlight_end_at.slice(0, 10) : '',
    display_order: p.display_order != null ? String(p.display_order) : '',
    publish_start_at: p.publish_start_at ? p.publish_start_at.slice(0, 10) : '',
  };
}

/** Convert form values → the API write payload. Used for both create and PATCH. */
export function buildProgrammePayload(v: ProgrammeFormValues): ProgrammeWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    short_code: blank(v.short_code),
    summary_en: blank(v.summary_en),
    summary_hi: blank(v.summary_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    objectives_en: blank(v.objectives_en),
    objectives_hi: blank(v.objectives_hi),
    eligibility_en: blank(v.eligibility_en),
    eligibility_hi: blank(v.eligibility_hi),
    benefits_en: blank(v.benefits_en),
    benefits_hi: blank(v.benefits_hi),
    application_process_en: blank(v.application_process_en),
    application_process_hi: blank(v.application_process_hi),
    funding_source: blank(v.funding_source),
    start_date: dateOnly(v.start_date),
    end_date: dateOnly(v.end_date),
    cover_media_id: v.cover_media_id ?? null,
    commodity_ids: v.commodity_ids,
    permitted_training_type_ids: v.permitted_training_type_ids,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
