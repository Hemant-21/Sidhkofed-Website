/**
 * Event News validators. `publish-as-news` accepts optional overrides (the editor may customize
 * news-facing fields without changing the source event). PATCH allows editing those same fields +
 * workflow fields. `event_id` is NEVER client-set on PATCH (the link is immutable).
 */
import { z } from 'zod';
import { parseSchema, workflowShape, refineHighlightWindow, uuid, isoTimestamp, optionalText } from '@/shared/validation';

const editableShape = {
  title_en: z.string().trim().min(1).max(255).optional(),
  title_hi: z.string().trim().max(255).nullable().optional(),
  summary_en: optionalText(),
  summary_hi: optionalText(),
  body_en: optionalText(),
  body_hi: optionalText(),
  cover_media_id: uuid.nullable().optional(),
  news_published_at: isoTimestamp.nullable().optional(),
  ...workflowShape,
};

/** Body of POST /admin/events/{id}/publish-as-news — all optional overrides. */
export const publishAsNewsSchema = z
  .object(editableShape)
  .strict()
  .superRefine((data, ctx) => refineHighlightWindow(data, ctx));
export type PublishAsNewsInput = z.infer<typeof publishAsNewsSchema>;
export const validatePublishAsNews = (p: unknown): PublishAsNewsInput => parseSchema(publishAsNewsSchema, p);

/** PATCH /admin/news/{id}. */
export const newsUpdateSchema = z
  .object(editableShape)
  .strict()
  .superRefine((data, ctx) => refineHighlightWindow(data, ctx));
export type NewsUpdateInput = z.infer<typeof newsUpdateSchema>;
export const validateNewsUpdate = (p: unknown): NewsUpdateInput => parseSchema(newsUpdateSchema, p);
