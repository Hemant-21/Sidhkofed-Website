/**
 * BaseMasterValidator (TASK 3) — shared zod building blocks reused by every master
 * definition, plus the single `parse` helper that turns zod issues into the §1.4
 * `validation_error` field map. Definitions compose these fragments instead of repeating
 * the common `name_en/name_hi/slug/is_active/display_order` shape 16 times.
 */
import { z, type ZodTypeAny } from 'zod';
import { ValidationError, type FieldErrors } from '@/shared/errors';

/** Run a schema, raising the shared ValidationError (422) on failure. */
export function parse<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload ?? {});
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  throw new ValidationError(fields);
}

// ── Reusable field fragments ────────────────────────────────────────────────
export const nameEn = z.string().trim().min(1, 'This field is required.').max(150);
export const nameHi = z.string().trim().max(150).nullable().optional();
export const optionalSlug = z.string().trim().min(1).max(160).optional();
export const isActive = z.boolean().optional();
export const displayOrder = z.number().int().nullable().optional();
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format.');

/** The common writable shape shared by name-based masters. */
export const baseCreateShape = {
  name_en: nameEn,
  name_hi: nameHi,
  slug: optionalSlug,
  is_active: isActive,
  display_order: displayOrder,
};

/** Build the standard create + update (partial) schema pair for a name-based master. */
export function standardSchemas(extra: z.ZodRawShape = {}): {
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
} {
  const createSchema = z.object({ ...baseCreateShape, ...extra }).strict();
  // slug is server-stable; never accepted on update.
  const updateSchema = z
    .object({ ...baseCreateShape, ...extra })
    .omit({ slug: true })
    .partial()
    .strict();
  return { createSchema, updateSchema };
}
