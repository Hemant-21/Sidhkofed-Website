/**
 * Reusable Zod schema primitives shared across future module forms (bilingual
 * pairs, email, mobile, URL, UUID). Keeps client validation consistent with the
 * backend contract — but the server remains the authoritative validator (these are
 * UX pre-checks only).
 */

import { z } from 'zod';
import { REGEX } from '@/constants/app';

/** Required English field + optional Hindi counterpart (codex §10). */
export const requiredEn = (label = 'This field') =>
  z.string().trim().min(1, `${label} is required.`);

export const optionalHi = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable();

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .regex(REGEX.email, 'Enter a valid email address.');

export const mobileSchema = z
  .string()
  .trim()
  .regex(REGEX.mobile, 'Enter a valid 10-digit mobile number.');

export const httpsUrlSchema = z
  .string()
  .trim()
  .regex(REGEX.url, 'Enter a valid URL starting with http:// or https://');

export const uuidSchema = z.string().regex(REGEX.uuid, 'Invalid reference.');

/** Array of UUIDs (relation pickers → comma-separated on the wire). */
export const uuidArraySchema = z.array(uuidSchema);

/** A bilingual title block reused by most content forms. */
export const bilingualTitle = z.object({
  title_en: requiredEn('Title (English)'),
  title_hi: optionalHi,
});
