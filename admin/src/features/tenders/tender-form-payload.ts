/**
 * Pure form ↔ API mapping for the tender form (unit-testable; no React).
 * GeM URL is passed as-is (validated by backend). Opening date may not precede publish date;
 * submission deadline is a date (backend may store as timestamp).
 */

import type { HighlightType } from '@/types/common';
import type { TenderDetail, TenderWriteInput, TenderStatus } from './types';

export interface TenderFormValues {
  title_en: string;
  title_hi: string;
  tender_type_id: string;
  tender_number: string;
  publish_date: string;
  submission_deadline: string;
  opening_date: string;
  tender_status: string;
  issuing_authority: string;
  short_description_en: string;
  short_description_hi: string;
  gem_url: string;
  related_category_or_department: string;
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

export function emptyTenderForm(): TenderFormValues {
  return {
    title_en: '',
    title_hi: '',
    tender_type_id: '',
    tender_number: '',
    publish_date: '',
    submission_deadline: '',
    opening_date: '',
    tender_status: 'open',
    issuing_authority: '',
    short_description_en: '',
    short_description_hi: '',
    gem_url: '',
    related_category_or_department: '',
    public_visibility: false,
    show_on_homepage: false,
    highlight_type: '',
    highlight_start_at: '',
    highlight_end_at: '',
    display_order: '',
    publish_start_at: '',
  };
}

export function tenderToForm(t: TenderDetail): TenderFormValues {
  return {
    title_en: t.title_en,
    title_hi: t.title_hi ?? '',
    tender_type_id: t.tender_type?.id ?? '',
    tender_number: t.tender_number ?? '',
    publish_date: t.publish_date ? t.publish_date.slice(0, 10) : '',
    submission_deadline: t.submission_deadline ? t.submission_deadline.slice(0, 10) : '',
    opening_date: t.opening_date ? t.opening_date.slice(0, 10) : '',
    tender_status: t.tender_status ?? 'open',
    issuing_authority: t.issuing_authority ?? '',
    short_description_en: t.short_description_en ?? '',
    short_description_hi: t.short_description_hi ?? '',
    gem_url: t.gem_url ?? '',
    related_category_or_department: t.related_category_or_department ?? '',
    public_visibility: t.public_visibility,
    show_on_homepage: t.show_on_homepage,
    highlight_type: t.highlight_type ?? '',
    highlight_start_at: t.highlight_start_at ? t.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: t.highlight_end_at ? t.highlight_end_at.slice(0, 10) : '',
    display_order: t.display_order != null ? String(t.display_order) : '',
    publish_start_at: t.publish_start_at ? t.publish_start_at.slice(0, 10) : '',
  };
}

export function buildTenderPayload(v: TenderFormValues): TenderWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    tender_type_id: v.tender_type_id,
    tender_number: blank(v.tender_number),
    publish_date: dateOnly(v.publish_date),
    submission_deadline: dateOnly(v.submission_deadline),
    opening_date: dateOnly(v.opening_date),
    tender_status: (blank(v.tender_status) as TenderStatus | null) ?? null,
    issuing_authority: blank(v.issuing_authority),
    short_description_en: blank(v.short_description_en),
    short_description_hi: blank(v.short_description_hi),
    gem_url: blank(v.gem_url),
    related_category_or_department: blank(v.related_category_or_department),
    public_visibility: v.public_visibility,
    show_on_homepage: v.show_on_homepage,
    highlight_type: highlight,
    highlight_start_at: highlight ? dateToIso(v.highlight_start_at) : null,
    highlight_end_at: highlight ? dateToIso(v.highlight_end_at) : null,
    display_order: v.display_order.trim() === '' ? null : Number(v.display_order),
    publish_start_at: dateToIso(v.publish_start_at),
  };
}
