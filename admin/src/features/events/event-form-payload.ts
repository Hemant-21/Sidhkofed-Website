/**
 * Pure form ↔ API mapping for the event form (unit-testable; no React). Converts the flat
 * string-friendly form state into the typed `EventWriteInput` the backend accepts: empties
 * become null, dynamic values are coerced to their declared types, and end_date is only sent
 * when the date mode needs it. Server-managed fields (slug, state, *_by) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { EventDetail, EventFieldDefinition, EventWriteInput, DateMode } from './types';

export interface EventFormValues {
  event_type_id: string;
  training_type_id: string;
  title_en: string;
  title_hi: string;
  summary_en: string;
  summary_hi: string;
  description_en: string;
  description_hi: string;
  date_mode: DateMode;
  start_date: string;
  end_date: string;
  location_text: string;
  district_id: string;
  block_id: string;
  cover_media_id: string | null;
  commodity_ids: string[];
  programme_ids: string[];
  institution_ids: string[];
  document_ids: string[];
  gallery_ids: string[];
  dynamic_values: Record<string, unknown>;
  public_visibility: boolean;
  show_on_homepage: boolean;
  highlight_type: string;
  highlight_start_at: string;
  highlight_end_at: string;
  display_order: string;
  publish_start_at: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const dateToIso = (v: string): string | null => (v ? `${v}T00:00:00.000Z` : null);

/** Default (empty) form values for the create route. */
export function emptyEventForm(): EventFormValues {
  return {
    event_type_id: '',
    training_type_id: '',
    title_en: '',
    title_hi: '',
    summary_en: '',
    summary_hi: '',
    description_en: '',
    description_hi: '',
    date_mode: 'single',
    start_date: '',
    end_date: '',
    location_text: '',
    district_id: '',
    block_id: '',
    cover_media_id: null,
    commodity_ids: [],
    programme_ids: [],
    institution_ids: [],
    document_ids: [],
    gallery_ids: [],
    dynamic_values: {},
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

/** Hydrate the form from an existing event (edit route). */
export function eventToForm(e: EventDetail): EventFormValues {
  return {
    event_type_id: e.event_type.id,
    training_type_id: e.training_type?.id ?? '',
    title_en: e.title_en,
    title_hi: e.title_hi ?? '',
    summary_en: e.summary_en ?? '',
    summary_hi: e.summary_hi ?? '',
    description_en: e.description_en ?? '',
    description_hi: e.description_hi ?? '',
    date_mode: e.date_mode,
    start_date: e.start_date ?? '',
    end_date: e.end_date ?? '',
    location_text: e.location_text ?? '',
    district_id: e.district?.id ?? '',
    block_id: e.block?.id ?? '',
    cover_media_id: e.cover_media?.id ?? null,
    commodity_ids: e.commodities.map((c) => c.id),
    programme_ids: e.programmes.map((p) => p.id),
    institution_ids: e.institutions.map((i) => i.id),
    document_ids: e.documents.map((d) => d.id),
    gallery_ids: e.galleries.map((g) => g.id),
    dynamic_values: { ...e.dynamic_values },
    public_visibility: e.public_visibility,
    show_on_homepage: e.show_on_homepage,
    highlight_type: e.highlight_type ?? '',
    highlight_start_at: e.highlight_start_at ? e.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: e.highlight_end_at ? e.highlight_end_at.slice(0, 10) : '',
    display_order: e.display_order != null ? String(e.display_order) : '',
    publish_start_at: e.publish_start_at ? e.publish_start_at.slice(0, 10) : '',
  };
}

/** Coerce a single dynamic value to its declared type; returns undefined when empty. */
function coerceDynamic(def: EventFieldDefinition, raw: unknown): unknown {
  if (raw === undefined || raw === null || raw === '') return undefined;
  switch (def.data_type) {
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      return Number.isNaN(n) ? raw : n; // leave invalid as-is so the backend reports it
    }
    case 'boolean':
      return Boolean(raw);
    default:
      return raw;
  }
}

/** Build the `dynamic_values` object from form state, keyed only by active definitions. */
export function buildDynamicValues(
  values: Record<string, unknown>,
  definitions: EventFieldDefinition[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const def of definitions) {
    const coerced = coerceDynamic(def, values[def.field_key]);
    if (coerced !== undefined) out[def.field_key] = coerced;
  }
  return out;
}

/**
 * Convert form values → the API write payload. `definitions` scopes/coerces dynamic values.
 * Used for both create and PATCH (PATCH simply tolerates the full set).
 */
export function buildEventPayload(
  v: EventFormValues,
  definitions: EventFieldDefinition[],
): EventWriteInput {
  const needsEnd = v.date_mode === 'range' || v.date_mode === 'multi_day';
  const highlight = blank(v.highlight_type) as HighlightType | null;

  return {
    event_type_id: v.event_type_id,
    training_type_id: blank(v.training_type_id),
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    summary_en: blank(v.summary_en),
    summary_hi: blank(v.summary_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    date_mode: v.date_mode,
    start_date: v.start_date,
    end_date: needsEnd ? blank(v.end_date) : null,
    location_text: blank(v.location_text),
    district_id: blank(v.district_id),
    block_id: blank(v.block_id),
    cover_media_id: v.cover_media_id || null,
    commodity_ids: v.commodity_ids,
    programme_ids: v.programme_ids,
    institution_ids: v.institution_ids,
    document_ids: v.document_ids,
    gallery_ids: v.gallery_ids,
    dynamic_values: buildDynamicValues(v.dynamic_values ?? {}, definitions),
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
