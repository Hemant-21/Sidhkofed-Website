/**
 * Pure form ↔ API mapping for the communication form (unit-testable; no React).
 * Converts the flat, string-friendly form state into the typed `CommunicationWriteInput`
 * the backend accepts: empties become null, highlights only sent when active, ISO timestamps
 * from calendar dates. Server-managed fields (slug, state, *_by) are never produced.
 */

import type { HighlightType } from '@/types/common';
import type { CommunicationDetail, CommunicationWriteInput } from './types';

export interface CommunicationFormValues {
  title_en: string;
  title_hi: string;
  communication_type_id: string;
  reference_number: string;
  issue_date: string;
  effective_date: string;
  expiry_date: string;
  issuing_authority: string;
  short_description_en: string;
  short_description_hi: string;
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

export function emptyCommunicationForm(): CommunicationFormValues {
  return {
    title_en: '',
    title_hi: '',
    communication_type_id: '',
    reference_number: '',
    issue_date: '',
    effective_date: '',
    expiry_date: '',
    issuing_authority: '',
    short_description_en: '',
    short_description_hi: '',
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

export function communicationToForm(c: CommunicationDetail): CommunicationFormValues {
  return {
    title_en: c.title_en,
    title_hi: c.title_hi ?? '',
    communication_type_id: c.communication_type?.id ?? '',
    reference_number: c.reference_number ?? '',
    issue_date: c.issue_date ? c.issue_date.slice(0, 10) : '',
    effective_date: c.effective_date ? c.effective_date.slice(0, 10) : '',
    expiry_date: c.expiry_date ? c.expiry_date.slice(0, 10) : '',
    issuing_authority: c.issuing_authority ?? '',
    short_description_en: c.short_description_en ?? '',
    short_description_hi: c.short_description_hi ?? '',
    document_id: c.document?.id ?? null,
    public_visibility: c.public_visibility,
    show_on_homepage: c.show_on_homepage,
    highlight_type: c.highlight_type ?? '',
    highlight_start_at: c.highlight_start_at ? c.highlight_start_at.slice(0, 10) : '',
    highlight_end_at: c.highlight_end_at ? c.highlight_end_at.slice(0, 10) : '',
    display_order: c.display_order != null ? String(c.display_order) : '',
    publish_start_at: c.publish_start_at ? c.publish_start_at.slice(0, 10) : '',
  };
}

export function buildCommunicationPayload(v: CommunicationFormValues): CommunicationWriteInput {
  const highlight = blank(v.highlight_type) as HighlightType | null;
  return {
    title_en: v.title_en.trim(),
    title_hi: blank(v.title_hi),
    communication_type_id: v.communication_type_id,
    reference_number: blank(v.reference_number),
    issue_date: dateOnly(v.issue_date),
    effective_date: dateOnly(v.effective_date),
    expiry_date: dateOnly(v.expiry_date),
    issuing_authority: blank(v.issuing_authority),
    short_description_en: blank(v.short_description_en),
    short_description_hi: blank(v.short_description_hi),
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
