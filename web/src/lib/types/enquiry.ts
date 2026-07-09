/**
 * Public enquiry submission payload/response — mirrors the backend contract exactly
 * (enquiries.validators.ts → enquirySubmitSchema, enquiries.dto.ts → EnquirySubmitDto).
 * Enquiries are NOT publishable content (no publication_state/slug); there is no public list,
 * only submission.
 */

export interface EnquirySubmitInput {
  name: string;
  mobile: string;
  email: string;
  enquiry_type_id: string;
  subject: string;
  message: string;
  organization?: string;
  commodity_id?: string;
  programme_scheme_id?: string;
  /** Opaque CAPTCHA response token — only meaningful when a provider is configured server-side. */
  captcha_token?: string;
  /** Honeypot — must stay empty/absent. Real visitors never see this field. */
  website?: string;
}

/** 201 response body: `{ id, submitted_at }` (API spec §6 — no acknowledgement email). */
export interface EnquirySubmitResult {
  id: string;
  submitted_at: string;
}
