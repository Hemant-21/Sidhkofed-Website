/**
 * Pure form ↔ API mapping for the procurement form (unit-testable; no React).
 * `rate` is entered as a string but sent to the backend as a JSON number (its validator accepts a
 * number, not a string); the frontend never calculates it. Period end cannot precede start;
 * block/district consistency is validated server-side.
 */

import type { HighlightType } from '@/types/common';
import type { ProcurementDetail, ProcurementWriteInput } from './types';

export interface ProcurementFormValues {
  title_en: string;
  title_hi: string;
  procurement_update_type_id: string;
  // Master-data ids (bounded dropdowns) — empty string means "none".
  commodity_id: string;
  district_id: string;
  block_id: string;
  // Content relation (server-side picker) — null means "none".
  programme_scheme_id: string | null;
  location_text: string;
  rate: string;
  unit: string;
  quantity: string;
  display_quantity_as_mt: boolean;
  effective_date: string;
  period_start: string;
  period_end: string;
  summary_en: string;
  summary_hi: string;
  description_en: string;
  description_hi: string;
  status: string;
  document_id: string | null;
  // workflow
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
/** Parse the rate text into a JSON number; empty or non-numeric → null (backend validates range). */
const toRate = (v: string): number | null => {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function emptyProcurementForm(): ProcurementFormValues {
  return {
    title_en: '',
    title_hi: '',
    procurement_update_type_id: '',
    commodity_id: '',
    district_id: '',
    block_id: '',
    programme_scheme_id: null,
    location_text: '',
    rate: '',
    unit: 'KG',
    quantity: '',
    display_quantity_as_mt: false,
    effective_date: '',
    period_start: '',
    period_end: '',
    summary_en: '',
    summary_hi: '',
    description_en: '',
    description_hi: '',
    status: '',
    document_id: null,
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

export function procurementToForm(p: ProcurementDetail): ProcurementFormValues {
  return {
    title_en: p.title_en,
    title_hi: p.title_hi ?? '',
    procurement_update_type_id: p.procurement_update_type?.id ?? '',
    commodity_id: p.commodity?.id ?? '',
    district_id: p.district?.id ?? '',
    block_id: p.block?.id ?? '',
    programme_scheme_id: p.programme?.id ?? null,
    location_text: p.location_text ?? '',
    rate: p.rate != null ? String(p.rate) : '',
    unit: p.unit ?? 'KG',
    quantity: p.quantity != null ? String(p.quantity) : '',
    display_quantity_as_mt: p.display_quantity_as_mt,
    effective_date: p.effective_date ? p.effective_date.slice(0, 10) : '',
    period_start: p.period_start ? p.period_start.slice(0, 10) : '',
    period_end: p.period_end ? p.period_end.slice(0, 10) : '',
    summary_en: p.summary_en ?? '',
    summary_hi: p.summary_hi ?? '',
    description_en: p.description_en ?? '',
    description_hi: p.description_hi ?? '',
    status: p.status ?? '',
    document_id: p.document?.id ?? null,
    public_visibility: p.public_visibility,
    show_on_homepage: p.show_on_homepage,
    highlight_type: p.highlight_type ?? '',
    highlight_start_at: p.highlight_start_at ? p.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: p.highlight_end_at ? p.highlight_end_at.slice(0, 10) : '',
    display_order: p.display_order != null ? String(p.display_order) : '',
    publish_start_at: p.publish_start_at ? p.publish_start_at.slice(0, 10) : '',
  };
}

export function buildProcurementPayload(v: ProcurementFormValues): ProcurementWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    procurement_update_type_id: v.procurement_update_type_id,
    commodity_id: blank(v.commodity_id),
    district_id: blank(v.district_id),
    block_id: blank(v.block_id),
    programme_scheme_id: v.programme_scheme_id ?? null,
    location_text: blank(v.location_text),
    rate: toRate(v.rate),
    unit: blank(v.unit),
    quantity: toRate(v.quantity),
    display_quantity_as_mt: v.display_quantity_as_mt,
    effective_date: dateOnly(v.effective_date),
    period_start: dateOnly(v.period_start),
    period_end: dateOnly(v.period_end),
    summary_en: blank(v.summary_en),
    summary_hi: blank(v.summary_hi),
    description_en: blank(v.description_en),
    description_hi: blank(v.description_hi),
    status: blank(v.status),
    document_id: v.document_id ?? null,
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
