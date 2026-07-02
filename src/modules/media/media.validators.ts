/**
 * Media request validators (body metadata + list query). File-content validation lives
 * in media.validation.ts; these cover the JSON/query fields.
 */
import { z } from 'zod';
import { ValidationError, type FieldErrors } from '@/shared/errors';

function parse<S extends z.ZodTypeAny>(schema: S, payload: unknown): z.infer<S> {
  const result = schema.safeParse(payload ?? {});
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  throw new ValidationError(fields);
}

const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

/** Optional descriptive metadata accepted on upload and PATCH. */
export const mediaMetaSchema = z.object({
  title: z.string().trim().max(255).optional(),
  alt_text: z.string().trim().max(500).optional(),
  caption: z.string().trim().max(500).optional(),
});
export type MediaMetaInput = z.infer<typeof mediaMetaSchema>;
export const validateMediaMeta = (payload: unknown): MediaMetaInput => parse(mediaMetaSchema, payload);

export const mediaQuerySchema = z.object({
  mime_type: z.string().trim().min(1).max(120).optional(),
  archived: boolish.optional(),
  search: z.string().trim().min(2).max(120).optional(),
  used_by: z.string().trim().min(1).max(60).optional(),
});
export type MediaQueryInput = z.infer<typeof mediaQuerySchema>;
export const validateMediaQuery = (payload: unknown): MediaQueryInput => parse(mediaQuerySchema, payload);
