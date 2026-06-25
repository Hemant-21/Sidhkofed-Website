/**
 * FAQ request validators (shape/field only; business rules live in the service). Accepts ONLY
 * model-backed fields + allowed workflow fields; rejects unknown keys.
 *
 * `faq_category_id` is optional (FAQs may be uncategorised); when supplied the service validates the
 * category exists and is active. `question_en`/`answer_en` are required (API spec §6).
 */
import { z } from 'zod';
import {
  parseSchema,
  workflowShape,
  refineHighlightWindow,
  uuid,
  requiredText,
  optionalText,
} from '@/shared/validation';

const baseShape = {
  faq_category_id: uuid.nullable().optional(),
  question_en: requiredText(500),
  question_hi: z.string().trim().max(500).nullable().optional(),
  answer_en: z.string().trim().min(1, 'This field is required.').max(20000),
  answer_hi: optionalText(),
  ...workflowShape,
};

export const faqCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type FaqCreateInput = z.infer<typeof faqCreateSchema>;
export const validateFaqCreate = (p: unknown): FaqCreateInput => parseSchema(faqCreateSchema, p);

export const faqUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type FaqUpdateInput = z.infer<typeof faqUpdateSchema>;
export const validateFaqUpdate = (p: unknown): FaqUpdateInput => parseSchema(faqUpdateSchema, p);
