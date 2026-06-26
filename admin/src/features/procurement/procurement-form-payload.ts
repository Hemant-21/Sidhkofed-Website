/**
 * Pure form ↔ API mapping for the procurement form (unit-testable; no React).
 * Rate/unit are strings throughout — never calculated or modified by the frontend.
 * Period end cannot precede start; block/district consistency validated server-side.
 */

import type { HighlightType } from '@/types/common';
import type { ProcurementDetail, ProcurementWriteInput } from './types';

export interface ProcurementFormValues {
  title_en: string;
  title_hi: string;
  procurement_update_type_id: string;
  commodity_id: string | null;
  programme_scheme_id: string | null;
  district_id: string | null;
  block_id: string | null;
  location_text: string;
  rate: string;
  unit: string;
  effective_date: string;
  period_start: string;
  period_end: string;
  short_description_en: string;
  short_description_hi: string;
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

export function emptyProcurementForm(): ProcurementFormValues {
  return {
    title_en: '',
    title_hi: '',
    procurement_update_type_id: '',
    commodity_id: null,
    programme_scheme_id: null,
    district_id: null,
    block_id: null,
    location_text: '',
    rate: '',
    unit: '',
    effective_date: '',
    period_start: '',
    period_end: '',
    short_description_en: '',
    short_description_hi: '',
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
    commodity_id: p.commodity?.id ?? null,
    programme_scheme_id: p.programme?.id ?? null,
    district_id: p.district?.id ?? null,
    block_id: p.block?.id ?? null,
    location_text: p.location_text ?? '',
    rate: p.rate ?? '',
    unit: p.unit ?? '',
    effective_date: p.effective_date ? p.effective_date.slice(0, 10) : '',
    period_start: p.period_start ? p.period_start.slice(0, 10) : '',
    period_end: p.period_end ? p.period_end.slice(0, 10) : '',
    short_description_en: p.short_description_en ?? '',
    short_description_hi: p.short_description_hi ?? '',
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
    commodity_id: v.commodity_id ?? null,
    programme_scheme_id: v.programme_scheme_id ?? null,
    district_id: v.district_id ?? null,
    block_id: v.block_id ?? null,
    location_text: blank(v.location_text),
    rate: blank(v.rate),
    unit: blank(v.unit),
    effective_date: dateOnly(v.effective_date),
    period_start: dateOnly(v.period_start),
    period_end: dateOnly(v.period_end),
    short_description_en: blank(v.short_description_en),
    short_description_hi: blank(v.short_description_hi),
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
