/**
 * User request validators (shape/field only; business rules — duplicate email, role existence,
 * self-edit and last-Super-Admin guards — live in the service). Built on the shared validation
 * infrastructure (`parseSchema` → §1.4 field-error envelope). Strict schemas reject unknown keys;
 * `email` is normalized (trim + lowercase); `password_hash`, `roles` of unknown keys, and any
 * server-managed field can never be set by the client.
 */
import { z } from 'zod';
import { parseSchema, requiredText } from '@/shared/validation';

/** Email — normalized to a trimmed, lowercased address. */
const email = z
  .string({ required_error: 'This field is required.' })
  .trim()
  .min(1, 'This field is required.')
  .email('Enter a valid email address.')
  .max(255)
  .transform((v) => v.toLowerCase());

/** Account password — minimum 8 chars, must contain a letter and a number. */
const password = z
  .string({ required_error: 'This field is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain a letter and a number.');

const preferredLanguage = z.enum(['en', 'hi'], { errorMap: () => ({ message: 'Must be "en" or "hi".' }) });

/** At least one role key; values are validated against the DB in the service (existence check). */
const roles = z.array(z.string().trim().min(1)).min(1, 'At least one role is required.').max(10);

// ── Create ────────────────────────────────────────────────────────────────────
export const userCreateSchema = z
  .object({
    email,
    full_name: requiredText(255),
    password,
    preferred_language: preferredLanguage.optional(),
    roles,
    is_active: z.boolean().optional(),
  })
  .strict();
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export const validateUserCreate = (p: unknown): UserCreateInput => parseSchema(userCreateSchema, p);

// ── Update (PATCH — partial) ───────────────────────────────────────────────────
export const userUpdateSchema = z
  .object({
    email,
    full_name: requiredText(255),
    preferred_language: preferredLanguage,
    roles,
  })
  .partial()
  .strict();
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export const validateUserUpdate = (p: unknown): UserUpdateInput => parseSchema(userUpdateSchema, p);

// ── Password reset (admin → another user) ──────────────────────────────────────
export const userPasswordSchema = z.object({ password }).strict();
export type UserPasswordInput = z.infer<typeof userPasswordSchema>;
export const validateUserPassword = (p: unknown): UserPasswordInput => parseSchema(userPasswordSchema, p);

// ── Status (activate / deactivate) ─────────────────────────────────────────────
export const userStatusSchema = z
  .object({ is_active: z.boolean({ required_error: 'This field is required.' }) })
  .strict();
export type UserStatusInput = z.infer<typeof userStatusSchema>;
export const validateUserStatus = (p: unknown): UserStatusInput => parseSchema(userStatusSchema, p);

// ── Self-service profile (any authenticated user; own account only) ────────────
export const profileUpdateSchema = z
  .object({
    full_name: requiredText(255),
    preferred_language: preferredLanguage,
  })
  .partial()
  .strict();
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export const validateProfileUpdate = (p: unknown): ProfileUpdateInput => parseSchema(profileUpdateSchema, p);

export const profilePasswordSchema = z
  .object({
    current_password: z.string({ required_error: 'This field is required.' }).min(1, 'This field is required.'),
    new_password: password,
  })
  .strict();
export type ProfilePasswordInput = z.infer<typeof profilePasswordSchema>;
export const validateProfilePassword = (p: unknown): ProfilePasswordInput => parseSchema(profilePasswordSchema, p);
