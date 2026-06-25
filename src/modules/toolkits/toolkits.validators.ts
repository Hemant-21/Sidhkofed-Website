/**
 * Toolkit request validators (shape/field only). Accepts ONLY model-backed fields + relation IDs +
 * workflow fields; rejects unknown keys. Cross-record rules (master activation, asset linkability,
 * duplicate slug, state transitions) live in the service.
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
  title_en: requiredText(255),
  title_hi: z.string().trim().max(255).nullable().optional(),
  summary_en: optionalText(),
  summary_hi: optionalText(),
  description_en: optionalText(),
  description_hi: optionalText(),
  programme_scheme_id: uuid.nullable().optional(),
  commodity_id: uuid.nullable().optional(),
  cover_media_id: uuid.nullable().optional(),
  ...workflowShape,
};

export const toolkitCreateSchema = z
  .object(baseShape)
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type ToolkitCreateInput = z.infer<typeof toolkitCreateSchema>;
export const validateToolkitCreate = (p: unknown): ToolkitCreateInput => parseSchema(toolkitCreateSchema, p);

export const toolkitUpdateSchema = z
  .object(baseShape)
  .partial()
  .strict()
  .superRefine((data, ctx) => {
    refineHighlightWindow(data, ctx);
  });
export type ToolkitUpdateInput = z.infer<typeof toolkitUpdateSchema>;
export const validateToolkitUpdate = (p: unknown): ToolkitUpdateInput => parseSchema(toolkitUpdateSchema, p);
