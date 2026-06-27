/**
 * Enquiry DTOs + mappers (API spec §6 Enquiries).
 *
 * Admin detail exposes all internal fields including spam_state and internal_notes.
 * Public submission response exposes only id and submitted_at.
 * Public contact fields (name, mobile, email) are never removed from admin views —
 * managers need to follow up — but are never exposed via any public-facing endpoint.
 */
import type { EnquiryRow } from './enquiries.repository';

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const dateStr = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

function masterRef(m: { id: string; slug: string; nameEn: string; nameHi: string | null }): MasterRef {
  return { id: m.id, slug: m.slug, name_en: m.nameEn, name_hi: m.nameHi };
}

// ── Admin summary (list) ──────────────────────────────────────────────────────
export interface EnquirySummaryDto {
  id: string;
  enquiry_type: MasterRef;
  name: string;
  email: string;
  mobile: string;
  subject: string;
  organization: string | null;
  spam_state: string;
  archived_at: string | null;
  submitted_at: string;
  created_at: string;
}

export function toEnquirySummaryDto(e: EnquiryRow): EnquirySummaryDto {
  return {
    id: e.id,
    enquiry_type: masterRef(e.enquiryType),
    name: e.name,
    email: e.email,
    mobile: e.mobile,
    subject: e.subject,
    organization: e.organization,
    spam_state: e.spamState,
    archived_at: iso(e.archivedAt),
    submitted_at: iso(e.submittedAt) ?? e.createdAt.toISOString(),
    created_at: e.createdAt.toISOString(),
  };
}

// ── Admin detail (single) ─────────────────────────────────────────────────────
export interface EnquiryDetailDto extends EnquirySummaryDto {
  message: string;
  commodity: MasterRef | null;
  programme_scheme: { id: string; title_en: string; short_code: string | null } | null;
  internal_notes: string | null;
  updated_at: string;
}

export function toEnquiryDetailDto(e: EnquiryRow): EnquiryDetailDto {
  return {
    ...toEnquirySummaryDto(e),
    message: e.message,
    commodity: e.commodity ? masterRef(e.commodity) : null,
    programme_scheme: e.programmeScheme
      ? { id: e.programmeScheme.id, title_en: e.programmeScheme.titleEn, short_code: e.programmeScheme.shortCode }
      : null,
    internal_notes: e.internalNotes,
    updated_at: e.updatedAt.toISOString(),
  };
}

// ── Public submission confirmation ────────────────────────────────────────────
export interface EnquirySubmitDto {
  id: string;
  submitted_at: string;
}

export function toEnquirySubmitDto(e: { id: string; submittedAt: Date }): EnquirySubmitDto {
  return { id: e.id, submitted_at: e.submittedAt.toISOString() };
}

// ── Export row (for XLSX generation) ─────────────────────────────────────────
export interface EnquiryExportRow {
  id: string;
  submitted_at: string;
  enquiry_type: string;
  name: string;
  email: string;
  mobile: string;
  organization: string;
  subject: string;
  message: string;
  commodity: string;
  programme_scheme: string;
  spam_state: string;
  archived_at: string;
}

export function toEnquiryExportRow(e: EnquiryRow): EnquiryExportRow {
  return {
    id: e.id,
    submitted_at: dateStr(e.submittedAt) ?? '',
    enquiry_type: e.enquiryType.nameEn,
    name: e.name,
    email: e.email,
    mobile: e.mobile,
    organization: e.organization ?? '',
    subject: e.subject,
    message: e.message,
    commodity: e.commodity?.nameEn ?? '',
    programme_scheme: e.programmeScheme?.titleEn ?? '',
    spam_state: e.spamState,
    archived_at: dateStr(e.archivedAt) ?? '',
  };
}
