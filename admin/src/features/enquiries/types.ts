/**
 * Enquiries module types — mirror of the backend admin DTOs (enquiries.dto.ts). Enquiries are NOT
 * publishable content (no publication_state/slug/highlight/homepage — enquiries.types.ts). The
 * admin surface reads, annotates (internal_notes + spam_state), archives, and exports; it never
 * creates or edits the public-submitted contact fields.
 */

export const ENQUIRIES_RESOURCE = 'enquiries';

/** Mirrors the Prisma `SpamState` enum (enquiries.types.ts → SPAM_STATES). */
export const SPAM_STATES = ['clean', 'suspected', 'spam'] as const;
export type SpamState = (typeof SPAM_STATES)[number];

export const SPAM_STATE_LABEL: Record<SpamState, string> = {
  clean: 'Clean',
  suspected: 'Suspected',
  spam: 'Spam',
};

export interface MasterRef {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
}

/** List row shape (EnquirySummaryDto). */
export interface EnquirySummary {
  id: string;
  enquiry_type: MasterRef;
  name: string;
  email: string;
  mobile: string;
  subject: string;
  organization: string | null;
  spam_state: SpamState;
  archived_at: string | null;
  submitted_at: string;
  created_at: string;
}

/** Detail shape (EnquiryDetailDto) — adds the message body and internal-only fields. */
export interface EnquiryDetail extends EnquirySummary {
  message: string;
  commodity: MasterRef | null;
  programme_scheme: { id: string; title_en: string; short_code: string | null } | null;
  internal_notes: string | null;
  updated_at: string;
}

/** Admin PATCH payload — the backend accepts ONLY these two fields (enquiries.validators.ts). */
export interface EnquiryAnnotateInput {
  internal_notes?: string | null;
  spam_state?: SpamState;
}

/** Allowed ordering fields for the admin list (enquiries.types.ts → ENQUIRY_ORDERING_FIELDS). */
export const ENQUIRY_ORDERING_FIELDS = ['submitted_at', 'created_at'] as const;
