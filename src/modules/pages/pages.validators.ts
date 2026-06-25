/**
 * Page request validators (shape/field only; business rules live in the service). Accepts ONLY
 * model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * The slug is server-generated on create and immutable thereafter (clients never send it). Page-only
 * SEO meta fields are optional overrides (CMS requirements §4.10 / §11).
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  requiredText,
  optionalText,
} from '@/shared/validation';

const metaTitle = z.string().trim().max(255).nullable().optional();

const baseShape = {
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  body_en: optionalText(),
  body_hi: optionalText(),
  meta_title_en: metaTitle,
  meta_title_hi: metaTitle,
  meta_description_en: optionalText(1000),
  meta_description_hi: optionalText(1000),
  ...workflowShape,
};

export const pageCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type PageCreateInput = z.infer<typeof pageCreateSchema>;
export const validatePageCreate = (p: unknown): PageCreateInput => parseSchema(pageCreateSchema, p);

export const pageUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;
export const validatePageUpdate = (p: unknown): PageUpdateInput => parseSchema(pageUpdateSchema, p);
