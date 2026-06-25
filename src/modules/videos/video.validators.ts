/**
 * Video request validators.
 */
import { z } from 'zod';
import { ValidationError, type FieldErrors } from '@/shared/errors';

function parse<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload ?? {});
  if (result.success) return result.data;
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  throw new ValidationError(fields);
}

export const videoCreateSchema = z.object({
  title_en: z.string().trim().min(1, 'This field is required.').max(255),
  title_hi: z.string().trim().max(255).optional(),
  description_en: z.string().trim().optional(),
  description_hi: z.string().trim().optional(),
  youtube_url: z.string().trim().min(1, 'This field is required.'),
  thumbnail_media_id: z.string().uuid().nullable().optional(),
  public_visibility: z.boolean().optional(),
  show_on_homepage: z.boolean().optional(),
  display_order: z.number().int().optional(),
});
export type VideoCreateInput = z.infer<typeof videoCreateSchema>;
export const validateVideoCreate = (p: unknown): VideoCreateInput => parse(videoCreateSchema, p);

export const videoUpdateSchema = videoCreateSchema.partial();
export type VideoUpdateInput = z.infer<typeof videoUpdateSchema>;
export const validateVideoUpdate = (p: unknown): VideoUpdateInput => parse(videoUpdateSchema, p);
