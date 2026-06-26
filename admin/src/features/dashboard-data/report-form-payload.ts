/**
 * Pure form ↔ API mapping for the dashboard report definition form (unit-testable; no React).
 * Converts the flat, string-friendly form state into the typed `ReportWriteInput` the backend
 * accepts. `report_key` is sent only on create (it is the stable, code-referenced identity and is
 * immutable thereafter). `layout_config` is an optional bounded JSON object (a fixed presentation
 * descriptor, never a builder); invalid JSON is reported as a field error before submit.
 * Server-managed fields (slug, state, *_by, published_at) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { ReportDetail, ReportWriteInput } from './types';

export interface ReportFormValues {
  report_key: string;
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  layout_config: string;
  is_active: boolean;
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

export function emptyReportForm(): ReportFormValues {
  return {
    report_key: '',
    title_en: '',
    title_hi: '',
    description_en: '',
    description_hi: '',
    layout_config: '',
    is_active: true,
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

export function reportToForm(r: ReportDetail): ReportFormValues {
  return {
    report_key: r.report_key,
    title_en: r.title_en,
    title_hi: r.title_hi ?? '',
    description_en: r.description_en ?? '',
    description_hi: r.description_hi ?? '',
    layout_config:
      r.layout_config != null ? JSON.stringify(r.layout_config, null, 2) : '',
    is_active: r.is_active,
    public_visibility: r.public_visibility,
    show_on_homepage: r.show_on_homepage,
    highlight_type: r.highlight_type ?? '',
    highlight_start_at: r.highlight_start_at ? r.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: r.highlight_end_at ? r.highlight_end_at.slice(0, 10) : '',
    display_order: r.display_order != null ? String(r.display_order) : '',
    publish_start_at: r.publish_start_at ? r.publish_start_at.slice(0, 10) : '',
  };
}

/** Parse the optional layout-config JSON. Returns `undefined` on parse failure (caller validates). */
export function parseLayoutConfig(raw: string): Record<string, unknown> | null | undefined {
  const text = raw.trim();
  if (text === '') return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed === null) return null;
    if (typeof parsed !== 'object' || Array.isArray(parsed)) return undefined; // must be an object
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Build the API write payload. `report_key` is included only on create. The caller must have
 * already validated `layout_config` parses (see {@link parseLayoutConfig}).
 */
export function buildReportPayload(v: ReportFormValues, isEdit: boolean): ReportWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  const layout = parseLayoutConfig(v.layout_config);
  const payload: ReportWriteInput = {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    layout_config: layout === undefined ? null : layout,
    is_active: v.is_active,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
  if (!isEdit) payload.report_key = v.report_key;
  return payload;
}
