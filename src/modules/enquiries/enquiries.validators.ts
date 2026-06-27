/**
 * Enquiry request validators (API spec §6 Enquiries).
 *
 * Public submit: required `name, mobile, email, enquiry_type_id, subject, message`; optional
 * `organization, commodity_id, programme_scheme_id, captcha_token`. Rejects attachments and
 * unknown fields (strict schemas). Honeypot field `website` must be absent/empty.
 *
 * Admin PATCH: accepts only `internal_notes` and `spam_state`; never public contact fields.
 */
import { z } from 'zod';
import { parseSchema, uuid } from '@/shared/validation';
import { SPAM_STATES } from './enquiries.types';

// ── Public submission ──────────────────────────────────────────────────────────
const mobileRe = /^\+?[0-9\s\-().]{7,20}$/;

export const enquirySubmitSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(150),
    mobile: z
      .string()
      .trim()
      .min(7, 'Mobile number is too short.')
      .max(20)
      .refine((v) => mobileRe.test(v), 'Invalid mobile number format.'),
    email: z.string().trim().email('Invalid email address.').max(255).toLowerCase(),
    enquiry_type_id: uuid,
    subject: z.string().trim().min(1, 'Subject is required.').max(255),
    message: z.string().trim().min(1, 'Message is required.').max(5000),
    organization: z.string().trim().max(255).optional(),
    commodity_id: uuid.optional(),
    programme_scheme_id: uuid.optional(),
    /** Opaque CAPTCHA response token — validated server-side against the provider. */
    captcha_token: z.string().max(2048).optional(),
    /** Honeypot — must be absent or empty. */
    website: z.string().max(0, 'Bot detected.').optional(),
  })
  .strict();

export type EnquirySubmitInput = z.infer<typeof enquirySubmitSchema>;

export const validateEnquirySubmit = (p: unknown): EnquirySubmitInput => parseSchema(enquirySubmitSchema, p);

// ── Admin PATCH ────────────────────────────────────────────────────────────────
export const enquiryAdminPatchSchema = z
  .object({
    internal_notes: z.string().trim().max(10000).nullable().optional(),
    spam_state: z.enum(SPAM_STATES).optional(),
  })
  .strict();

export type EnquiryAdminPatchInput = z.infer<typeof enquiryAdminPatchSchema>;

export const validateEnquiryAdminPatch = (p: unknown): EnquiryAdminPatchInput =>
  parseSchema(enquiryAdminPatchSchema, p);
