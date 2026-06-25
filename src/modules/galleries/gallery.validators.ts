/**
 * Gallery request validators.
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

export const galleryCreateSchema = z.object({
  title_en: z.string().trim().min(1, 'This field is required.').max(255),
  title_hi: z.string().trim().max(255).optional(),
  description_en: z.string().trim().optional(),
  description_hi: z.string().trim().optional(),
  cover_media_id: z.string().uuid().nullable().optional(),
  public_visibility: z.boolean().optional(),
  show_on_homepage: z.boolean().optional(),
  display_order: z.number().int().optional(),
});
export type GalleryCreateInput = z.infer<typeof galleryCreateSchema>;
export const validateGalleryCreate = (p: unknown): GalleryCreateInput => parse(galleryCreateSchema, p);

export const galleryUpdateSchema = galleryCreateSchema.partial();
export type GalleryUpdateInput = z.infer<typeof galleryUpdateSchema>;
export const validateGalleryUpdate = (p: unknown): GalleryUpdateInput => parse(galleryUpdateSchema, p);

export const galleryImageSchema = z.object({
  media_id: z.string().uuid(),
  display_order: z.number().int().optional(),
  caption_en: z.string().trim().max(500).optional(),
  caption_hi: z.string().trim().max(500).optional(),
});
export type GalleryImageInput = z.infer<typeof galleryImageSchema>;
export const validateGalleryImage = (p: unknown): GalleryImageInput => parse(galleryImageSchema, p);

export const galleryImageUpdateSchema = z.object({
  display_order: z.number().int().optional(),
  caption_en: z.string().trim().max(500).nullable().optional(),
  caption_hi: z.string().trim().max(500).nullable().optional(),
});
export type GalleryImageUpdateInput = z.infer<typeof galleryImageUpdateSchema>;
export const validateGalleryImageUpdate = (p: unknown): GalleryImageUpdateInput => parse(galleryImageUpdateSchema, p);

export const reorderSchema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), display_order: z.number().int() })).min(1),
});
export type ReorderInput = z.infer<typeof reorderSchema>;
export const validateReorder = (p: unknown): ReorderInput => parse(reorderSchema, p);
